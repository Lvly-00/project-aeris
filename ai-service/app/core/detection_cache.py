"""
Detection Cache - Thread-safe in-memory cache for detection results.
Stores the latest detection set per camera for fast API reads.
"""
import logging
import threading
import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field

from ..models.yolo_detector import Detection

logger = logging.getLogger(__name__)


@dataclass
class CachedDetection:
    """Cached detection result for a single camera."""
    camera_id: int
    detections: List[Detection]
    timestamp: float
    inference_time_ms: float
    frame_width: int = 0
    frame_height: int = 0


class DetectionCache:
    """Thread-safe cache mapping camera_id -> latest CachedDetection."""

    def __init__(self):
        self._cache: Dict[int, CachedDetection] = {}
        self._lock = threading.Lock()
        self._update_events: Dict[int, threading.Event] = {}

    def update(
        self,
        camera_id: int,
        detections: List[Detection],
        inference_time_ms: float,
        frame_width: int = 0,
        frame_height: int = 0,
    ):
        """Update the cache with new detection results for a camera."""
        with self._lock:
            self._cache[camera_id] = CachedDetection(
                camera_id=camera_id,
                detections=detections,
                timestamp=time.time(),
                inference_time_ms=inference_time_ms,
                frame_width=frame_width,
                frame_height=frame_height,
            )
            event = self._update_events.get(camera_id)
            if event:
                event.set()

    def get(self, camera_id: int) -> Optional[CachedDetection]:
        """Get the latest cached detection for a camera."""
        with self._lock:
            return self._cache.get(camera_id)

    def get_all(self) -> Dict[int, CachedDetection]:
        """Get all cached detections."""
        with self._lock:
            return self._cache.copy()

    def wait_for_update(
        self, camera_id: int, after_timestamp: float, timeout: float = 1.0
    ) -> Optional[CachedDetection]:
        """Block until the cache is updated after the given timestamp, or timeout."""
        event = threading.Event()
        with self._lock:
            existing = self._update_events.get(camera_id)
            if existing is None:
                self._update_events[camera_id] = event
            else:
                event = existing

        deadline = time.time() + timeout
        while time.time() < deadline:
            cached = self.get(camera_id)
            if cached and cached.timestamp >= after_timestamp:
                return cached
            remaining = deadline - time.time()
            if remaining > 0:
                event.wait(timeout=min(0.05, remaining))
                event.clear()

        return self.get(camera_id)

    def remove(self, camera_id: int):
        """Remove a camera from the cache."""
        with self._lock:
            self._cache.pop(camera_id, None)
            self._update_events.pop(camera_id, None)

    def clear(self):
        """Clear all cached detections."""
        with self._lock:
            self._cache.clear()
            self._update_events.clear()
