"""
Incident Pusher - Bridges DetectionWorker results to the Django backend.

Called from DetectionWorker after every detection batch. For each
incident-worthy detection (Fire, Smoke, Vehicle_Accident) it fires a
multipart POST to /api/ai/incidents/create/ so that Django can create or
update an Incident row and broadcast it over WebSocket to the PWA.

That route is the public twin of /internal/incidents/create/: nginx refuses
/internal/ from outside the Docker subnet, which is exactly what a desktop
install is, so the sidecar authenticates with X-API-Key (AI_SERVICE_API_KEY)
instead of X-Internal-Key.

Deduplication strategy (two layers):
  1. Per-camera, per-type open-incident tracking: once the backend confirms an
     incident is open (grouped=true), the pusher suppresses further pushes for
     that (camera, type) pair for OPEN_INCIDENT_RECHECK_SECONDS. This avoids
     hammering the backend while an incident is actively being handled.
  2. PUSH_COOLDOWN_SECONDS acts as a short gate for the first push and for
     re-arm attempts after the longer suppression window expires. The backend's
     own select_for_update dedup is the final safety net for race conditions.

An incident slot is re-armed (pusher starts sending again) only after:
  - The long suppression window expires AND the backend returns grouped=false
    (meaning the previous incident was closed and a new one was created), OR
  - The incident is explicitly dismissed/resolved on the backend (the slot
    clears naturally once the suppression window expires and the next push
    creates a fresh incident).
"""
import logging
import threading
import time
import cv2
from typing import Dict, Set, Tuple

import requests

from ..config import BACKEND_API_URL, INTERNAL_API_KEY, AI_SERVICE_API_KEY
from ..models.yolo_detector import Detection

logger = logging.getLogger(__name__)

# Incident types that should be pushed to Django.
INCIDENT_TYPES = {"Fire", "Smoke", "Vehicle_Accident"}

# Short cooldown (seconds) between push attempts when no open incident exists.
# This is the cadence for the *first* detection and for re-arm probes.
PUSH_COOLDOWN_SECONDS = 15.0

# How long to suppress pushes after the backend confirms an incident is already
# open (grouped=true). The backend still handles the incident; we just stop
# sending redundant frames until the suppression window expires, at which point
# we probe once to see if the slot was cleared (dismissed/resolved).
OPEN_INCIDENT_RECHECK_SECONDS = 60.0

# Connection / read timeouts for the POST call (seconds).
REQUEST_TIMEOUT = (5, 10)


class IncidentPusher:
    """
    Thread-safe helper that POSTs detection hits to Django.

    One shared instance is held by CameraManager and injected into every
    DetectionWorker. The underlying requests.Session is re-used across
    cameras so connections stay alive.

    Deduplication:
      • _open_incidents: set of (camera_id, incident_type) pairs that the
        backend has confirmed are currently open. While a pair is in this set
        the pusher applies a long suppression window (OPEN_INCIDENT_RECHECK_SECONDS)
        instead of the short cooldown, so the backend isn't flooded for the
        duration of an ongoing incident.
      • When the backend returns grouped=false (new incident created), the pair
        is removed from _open_incidents, signalling that the slot was re-armed.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # Maps (camera_id, incident_type) -> last push timestamp
        self._last_push: Dict[Tuple[int, str], float] = {}
        # (camera_id, incident_type) pairs the backend confirmed are still open.
        self._open_incidents: Set[Tuple[int, str]] = set()

        self._session = requests.Session()
        # /internal/ is restricted to the Docker network, so a desktop install
        # (whose AI service runs on the operator's PC) is refused there with
        # 403. The public /api/ai/ endpoints accept the service key instead and
        # still work inside Docker, so always use those.
        key = AI_SERVICE_API_KEY or INTERNAL_API_KEY
        self._session.headers.update({
            "X-API-Key": key,
            "Accept": "application/json",
        })
        # BACKEND_API_URL already includes the /api prefix, so paths append to it.
        # e.g. https://host/api → https://host/api/ai/incidents/create/
        self._incident_url = f"{BACKEND_API_URL.rstrip('/')}/ai/incidents/create/"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def push_detections(self, camera_id: int, detections) -> None:
        """
        Called from DetectionWorker after a frame is processed.
        Filters to incident-worthy types and pushes each one that
        passes the cooldown / open-incident gate.
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
        """
        Return True if this (camera, type) pair is eligible for a push.

        Uses two cooldown tiers:
          - OPEN_INCIDENT_RECHECK_SECONDS while the backend reports an open
            incident for this pair (grouped=true), so we only probe
            occasionally to detect when the incident was closed.
          - PUSH_COOLDOWN_SECONDS otherwise, as a standard anti-flood guard.
        """
        key = (camera_id, incident_type)
        with self._lock:
            now = time.time()
            last = self._last_push.get(key, 0.0)
            cooldown = (
                OPEN_INCIDENT_RECHECK_SECONDS
                if key in self._open_incidents
                else PUSH_COOLDOWN_SECONDS
            )
            if now - last < cooldown:
                return False
            # Mark as "about to push" while still holding the lock
            # so concurrent workers don't double-push.
            self._last_push[key] = now
            return True

    def _do_push(self, det: Detection) -> None:
        """POST a single detection to Django's incident-create endpoint."""
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
                key = (det.camera_id, det.incident_type)

                if grouped:
                    # Backend folded this into an existing open incident.
                    # Mark the slot as occupied so we apply the longer
                    # suppression window until the incident is closed.
                    with self._lock:
                        self._open_incidents.add(key)
                    logger.info(
                        "Camera %d: %s grouped into open incident #%s — "
                        "suppressing pushes for %ds",
                        det.camera_id, det.incident_type, incident_id,
                        OPEN_INCIDENT_RECHECK_SECONDS,
                    )
                else:
                    # Backend created a new incident — the previous slot was
                    # closed (dismissed/resolved) or this is the first detection.
                    # Remove from open set so the short cooldown applies next.
                    with self._lock:
                        self._open_incidents.discard(key)
                    logger.info(
                        "Camera %d: new incident #%s created for %s (conf=%.2f)",
                        det.camera_id, incident_id,
                        det.incident_type, det.confidence,
                    )

            elif resp.status_code in (401, 403):
                logger.warning(
                    "Camera %d: incident push returned %d — the backend rejected the "
                    "service key; AI_SERVICE_API_KEY must match on both sides",
                    det.camera_id, resp.status_code,
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
