"""
Incident Pusher - Bridges DetectionWorker results to the Django backend.

Called from DetectionWorker after every detection batch. For each
incident-worthy detection (Fire, Smoke, Vehicle_Accident) it fires a
POST to /api/incidents/create-from-detection/ with source="ai" so that
Django can create or update an Incident row and broadcast it over
WebSocket to the PWA.

A per-camera, per-type cooldown (PUSH_COOLDOWN_SECONDS) prevents the
pusher from flooding Django while the same detection stays in frame.
Django's create-from-detection view handles its own grouping/dedup on
top of this, so the cooldown is just a "don't hammer the API" guard.
"""
import logging
import threading
import time
import cv2
from typing import Dict, Tuple

import requests

from ..config import BACKEND_API_URL, INTERNAL_API_KEY, AI_SERVICE_API_KEY
from ..models.yolo_detector import Detection

logger = logging.getLogger(__name__)

# Incident types that should be pushed to Django.
INCIDENT_TYPES = {"Fire", "Smoke", "Vehicle_Accident"}

# Minimum seconds between pushes for the same (camera, incident_type) pair.
PUSH_COOLDOWN_SECONDS = 10.0

# Connection / read timeouts for the POST call (seconds).
REQUEST_TIMEOUT = (5, 10)


class IncidentPusher:
    """
    Thread-safe helper that POSTs detection hits to Django.

    One shared instance is held by CameraManager and injected into every
    DetectionWorker. The underlying requests.Session is re-used across
    cameras so connections stay alive.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # Maps (camera_id, incident_type) -> last push timestamp
        self._last_push: Dict[Tuple[int, str], float] = {}

        self._session = requests.Session()
        # Prefer INTERNAL_API_KEY so we get the same auth the camera
        # auto-register flow uses; fall back to the public AI key.
        key = INTERNAL_API_KEY or AI_SERVICE_API_KEY
        self._session.headers.update({
            "X-Internal-Key": key,
            "Accept": "application/json",
        })
        # Base URL without trailing slash so we can append paths cleanly.
        # The internal endpoint lives at /internal/ (no /api/ prefix).
        base = BACKEND_API_URL.rstrip("/")
        # Strip /api suffix if present to get the Django root, then point
        # at the internal path.  e.g. http://localhost:8000/api → http://localhost:8000
        if base.endswith("/api"):
            django_root = base[:-4]
        else:
            django_root = base
        self._incident_url = f"{django_root}/internal/incidents/create/"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def push_detections(self, camera_id: int, detections) -> None:
        """
        Called from DetectionWorker after a frame is processed.
        Filters to incident-worthy types and pushes each one that
        passes the cooldown gate.
        """
        for det in detections:
            if det.incident_type not in INCIDENT_TYPES:
                continue
            if not self._should_push(camera_id, det.incident_type):
                continue
            self._do_push(det)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _should_push(self, camera_id: int, incident_type: str) -> bool:
        """Return True if the cooldown has expired for this pair."""
        key = (camera_id, incident_type)
        with self._lock:
            last = self._last_push.get(key, 0.0)
            now = time.time()
            if now - last < PUSH_COOLDOWN_SECONDS:
                return False
            # Mark as "about to push" while still holding the lock
            # so concurrent workers don't double-push.
            self._last_push[key] = now
            return True

    def _do_push(self, det: Detection) -> None:
        """POST a single detection to Django's internal incident-create endpoint."""
        url = self._incident_url

        # Build multipart form data: small JPEG snapshot if a frame is available.
        data: Dict = {
            "incident_type": det.incident_type,
            "camera_id": det.camera_id,
            "confidence_score": str(round(det.confidence, 4)),
            "source": "ai",
            "bbox": _bbox_to_str(det.bbox),
        }

        files = None
        if det.frame is not None:
            try:
                annotated = _annotate_frame(det.frame, det)
                ok, buf = cv2.imencode(
                    ".jpg", annotated,
                    [cv2.IMWRITE_JPEG_QUALITY, 85],
                )
                if ok:
                    files = {"evidence": ("detection.jpg", buf.tobytes(), "image/jpeg")}
            except Exception as exc:
                logger.debug("Could not encode frame for incident push: %s", exc)

        try:
            if files:
                resp = self._session.post(
                    url, data=data, files=files, timeout=REQUEST_TIMEOUT
                )
            else:
                resp = self._session.post(
                    url, data=data, timeout=REQUEST_TIMEOUT
                )

            if resp.status_code in (200, 201):
                body = resp.json()
                grouped = body.get("grouped", False)
                incident_id = body.get("id")
                logger.info(
                    "Camera %d: pushed %s (conf=%.2f) → incident #%s (%s)",
                    det.camera_id,
                    det.incident_type,
                    det.confidence,
                    incident_id,
                    "grouped" if grouped else "new",
                )
            elif resp.status_code == 401:
                logger.warning(
                    "Camera %d: incident push returned 401 — check INTERNAL_API_KEY",
                    det.camera_id,
                )
            else:
                logger.warning(
                    "Camera %d: incident push returned %d: %s",
                    det.camera_id, resp.status_code, resp.text[:200],
                )
        except requests.exceptions.ConnectionError:
            logger.warning(
                "Camera %d: incident push failed — cannot reach %s",
                det.camera_id, self._incident_url,
            )
        except requests.exceptions.Timeout:
            logger.warning(
                "Camera %d: incident push timed out for %s",
                det.camera_id, det.incident_type,
            )
        except Exception as exc:
            logger.error(
                "Camera %d: unexpected error pushing incident: %s",
                det.camera_id, exc,
            )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bbox_to_str(bbox) -> str:
    """Serialise a bbox list/tuple to a JSON-like string for the form field."""
    import json
    try:
        if bbox is None:
            return "[]"
        if isinstance(bbox, (list, tuple)):
            return json.dumps([round(float(v), 2) for v in bbox])
        return json.dumps(bbox)
    except Exception:
        return "[]"


def _annotate_frame(frame, det: Detection):
    """
    Return a copy of frame with the detection bounding box and label drawn on it.

    Uses colour coding per incident type so the evidence image clearly shows
    what the model saw and where it was in the frame.
    """
    import numpy as np

    COLORS = {
        "Fire":             (0,   60,  255),   # red (BGR)
        "Smoke":            (0,  140,  255),   # orange
        "Vehicle_Accident": (0,  215,  255),   # gold
    }
    color = COLORS.get(det.incident_type, (0, 255, 0))

    img = frame.copy()
    h, w = img.shape[:2]

    # Draw bbox if valid
    bbox = det.bbox
    if bbox and len(bbox) == 4:
        x1, y1, x2, y2 = (
            max(0, int(bbox[0])),
            max(0, int(bbox[1])),
            min(w, int(bbox[2])),
            min(h, int(bbox[3])),
        )
        if x2 > x1 and y2 > y1:
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)

            label = f"{det.incident_type.replace('_', ' ')}  {det.confidence:.0%}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            scale = max(0.5, min(1.0, w / 1280))
            thickness = max(1, int(scale * 2))
            (tw, th), baseline = cv2.getTextSize(label, font, scale, thickness)

            # Label background
            lx1, ly1 = x1, max(0, y1 - th - baseline - 6)
            lx2, ly2 = min(w, x1 + tw + 8), y1
            cv2.rectangle(img, (lx1, ly1), (lx2, ly2), color, cv2.FILLED)

            # White label text
            cv2.putText(
                img, label,
                (lx1 + 4, ly2 - baseline - 2),
                font, scale, (255, 255, 255), thickness, cv2.LINE_AA,
            )

    # Timestamp watermark bottom-left
    import time as _time
    ts = _time.strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        img, ts,
        (10, h - 10),
        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA,
    )
    # Thin shadow for readability on any background
    cv2.putText(
        img, ts,
        (11, h - 9),
        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA,
    )

    return img
