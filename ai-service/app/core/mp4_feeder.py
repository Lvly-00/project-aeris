"""
MP4 Feeder - reads a local video file and pushes frames into a CameraManager
upload buffer so the DetectionWorker can process them just like a live stream.

Used in two places:
  1. Startup auto-registration (_auto_register_cameras in main.py)
  2. try_auto_register in CameraManager when a camera's stream_type is MP4

The loop runs indefinitely, restarting the file from the beginning when it
ends, so a test MP4 file behaves like a looping live stream.
"""
import logging
import time
from pathlib import Path

import cv2

logger = logging.getLogger(__name__)


def _resolve_mp4_path(raw: str):
    """
    Resolve a stored stream_url value to an absolute Path.
    Returns the resolved Path if it exists, or None.

    Handles:
    - Absolute paths (used as-is)
    - Bare filenames (searched in common project locations)
    """
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate if candidate.is_file() else None

    # Search relative to the project root (two levels above this file:
    # ai-service/app/core/mp4_feeder.py → project root)
    project_root = Path(__file__).resolve().parents[3]

    search_roots = [
        project_root,
        project_root / "backend",
        project_root / "ai-service",
    ]
    search_subs = ["", "sample videos", "videos", "mp4", "media/videos", "media"]

    for root in search_roots:
        for sub in search_subs:
            p = (root / sub / candidate) if sub else (root / candidate)
            p = p.resolve()
            if p.is_file():
                return p

    return None


def start_mp4_feeder(camera_id: int, raw_path: str, manager) -> None:
    """
    Entry point for the MP4 feeder thread.

    Resolves the path, then loops the video file, pushing frames into the
    manager's upload buffer. Runs until the process exits (daemon thread).
    """
    resolved = _resolve_mp4_path(raw_path)
    if resolved is None:
        logger.warning(
            "MP4 feeder camera %d: file not found: %s — detection disabled",
            camera_id, raw_path,
        )
        return

    file_path = str(resolved)
    logger.info("MP4 feeder camera %d: starting loop on %s", camera_id, file_path)

    while True:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            logger.warning(
                "MP4 feeder camera %d: cannot open %s, retrying in 5 s",
                camera_id, file_path,
            )
            time.sleep(5)
            continue

        native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        # Cap at 30 fps to avoid pegging the CPU; detection runs at its own rate
        frame_delay = 1.0 / min(native_fps, 30.0)

        while True:
            ret, frame = cap.read()
            if not ret:
                # End of file — restart the loop
                break
            manager.upload_frame(camera_id, frame)
            time.sleep(frame_delay)

        cap.release()
        # Tiny pause before rewinding to prevent a tight spin on corrupt files
        time.sleep(0.2)
