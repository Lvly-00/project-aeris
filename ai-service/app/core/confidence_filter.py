"""
Confidence Filter - Filters detections based on confidence thresholds.
Supports per-incident-type thresholds and temporal redundancy dedup.
Thread-safe: safe to share across DetectionWorker threads.
"""
import logging
import threading
from typing import Dict, List
from ..models.yolo_detector import Detection

logger = logging.getLogger(__name__)


class ConfidenceFilter:
    def __init__(self, default_threshold: float = 0.3):
        self.default_threshold = default_threshold
        self.type_thresholds: Dict[str, float] = {
            "Fire": 0.5,
            "Smoke": 0.5,
            "Vehicle_Accident": 0.5,
        }
        self.recent_detections: Dict[str, List[float]] = {}
        self.temporal_window = 2.0
        self._lock = threading.Lock()

    def filter(self, detections: List[Detection]) -> List[Detection]:
        """Filter detections by confidence and temporal redundancy."""
        filtered = []

        with self._lock:
            for det in detections:
                threshold = self.type_thresholds.get(det.incident_type, self.default_threshold)

                if det.confidence < threshold:
                    continue

                type_key = f"{det.camera_id}:{det.incident_type}"
                now = det.timestamp

                if type_key in self.recent_detections:
                    recent_times = self.recent_detections[type_key]
                    recent_times = [t for t in recent_times if now - t < self.temporal_window]
                    if recent_times:
                        self.recent_detections[type_key] = recent_times + [now]
                        continue
                    self.recent_detections[type_key] = recent_times

                if type_key not in self.recent_detections:
                    self.recent_detections[type_key] = []
                self.recent_detections[type_key].append(now)

                filtered.append(det)

        return filtered

    def set_type_threshold(self, incident_type: str, threshold: float):
        """Set confidence threshold for a specific incident type."""
        self.type_thresholds[incident_type] = max(0.0, min(1.0, threshold))

    def get_type_threshold(self, incident_type: str) -> float:
        return self.type_thresholds.get(incident_type, self.default_threshold)
