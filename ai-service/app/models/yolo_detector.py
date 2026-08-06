"""
YOLO Detection Service - Runs inference using YOLOv11
Detects: people, vehicles, and maps COCO classes to barangay incidents
"""
import cv2
import numpy as np
import logging
import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class Detection:
    camera_id: int
    incident_type: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    timestamp: float
    frame: Optional[np.ndarray] = None
    crowd_size: Optional[int] = None

class YOLODetector:
    # Mapping from COCO class IDs (yolo11n.pt is COCO-trained)
    COCO_LABELS = {
        0: "Person",
        1: "Bicycle",
        2: "Car",
        3: "Motorcycle",
        5: "Bus",
        7: "Truck",
    }

    # Vehicle classes for accident detection
    VEHICLE_CLASSES = {2, 3, 5, 7}

    def __init__(self, model, confidence_threshold: float = 0.3):
        self.model = model
        self.confidence_threshold = confidence_threshold
        self.class_names = model.names if hasattr(model, 'names') else {}

    def detect(self, frame: np.ndarray, camera_id: int) -> List[Detection]:
        """Run detection on a single frame"""
        if frame is None:
            return []

        start_time = time.time()
        results = self.model(frame, conf=self.confidence_threshold)
        inference_time = time.time() - start_time

        detections = []
        if len(results) == 0:
            return detections

        result = results[0]
        if result.boxes is None:
            return detections

        boxes = result.boxes
        timestamp = time.time()

        person_count = 0
        vehicle_bboxes = []

        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].tolist()
            conf = float(boxes.conf[i])
            cls_id = int(boxes.cls[i])

            label = self.COCO_LABELS.get(cls_id)
            if label is None:
                continue

            detection = Detection(
                camera_id=camera_id,
                incident_type=label,
                confidence=conf,
                bbox=xyxy,
                timestamp=timestamp,
                frame=frame.copy()
            )
            detections.append(detection)

            if cls_id == 0:
                person_count += 1
            elif cls_id in self.VEHICLE_CLASSES:
                vehicle_bboxes.append(xyxy)

        logger.debug(f"Camera {camera_id}: {len(detections)} detections in {inference_time*1000:.1f}ms")
        return detections

    def detect_batch(self, frames: Dict[int, np.ndarray]) -> Dict[int, List[Detection]]:
        """Run detection on multiple frames"""
        results = {}
        for camera_id, frame in frames.items():
            results[camera_id] = self.detect(frame, camera_id)
        return results
