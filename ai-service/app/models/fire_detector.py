import cv2
import numpy as np
import logging
import time
from typing import List
from ..models.yolo_detector import Detection

logger = logging.getLogger(__name__)


class SimpleFireDetector:
    FIRE_MIN_PCT = 0.02
    SMOKE_MIN_PCT = 0.03
    WATER_MIN_PCT = 0.03

    FIRE_LOWER1 = np.array([0, 80, 150])
    FIRE_UPPER1 = np.array([10, 255, 255])
    FIRE_LOWER2 = np.array([170, 80, 150])
    FIRE_UPPER2 = np.array([180, 255, 255])

    SMOKE_LOWER = np.array([0, 0, 200])
    SMOKE_UPPER = np.array([180, 15, 255])

    WATER_LOWER1 = np.array([95, 60, 60])
    WATER_UPPER1 = np.array([125, 255, 255])
    WATER_LOWER2 = np.array([0, 15, 40])
    WATER_UPPER2 = np.array([30, 60, 160])
    WATER_LOWER3 = np.array([160, 15, 40])
    WATER_UPPER3 = np.array([180, 60, 160])

    VEHICLE_OVERLAP_THRESHOLD = 0.25

    def __init__(self):
        self._prev_fire_px: dict[int, int] = {}
        self._frame_count: dict[int, int] = {}
        self._prev_water_mask: dict[int, np.ndarray] = {}
        self._water_hit_count: dict[int, int] = {}
        self._water_consecutive: dict[int, int] = {}
        self._prev_smoke_px: dict[int, int] = {}
        self._smoke_frame_count: dict[int, int] = {}

    def detect(self, frame: np.ndarray, camera_id: int, yolo_detections: List[Detection] = None) -> List[Detection]:
        if frame is None:
            return []
        detections = []
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        h, w = frame.shape[:2]
        total_px = h * w

        # --- Fire detection ---
        mask1 = cv2.inRange(hsv, self.FIRE_LOWER1, self.FIRE_UPPER1)
        mask2 = cv2.inRange(hsv, self.FIRE_LOWER2, self.FIRE_UPPER2)
        fire_mask = cv2.bitwise_or(mask1, mask2)
        fire_mask = cv2.erode(fire_mask, None, iterations=2)
        fire_mask = cv2.dilate(fire_mask, None, iterations=2)
        fire_px = cv2.countNonZero(fire_mask)
        if fire_px / total_px > self.FIRE_MIN_PCT:
            prev = self._prev_fire_px.get(camera_id, 0)
            count = self._frame_count.get(camera_id, 0) + 1
            self._frame_count[camera_id] = count
            self._prev_fire_px[camera_id] = fire_px
            flicker = abs(fire_px - prev) / max(fire_px, prev, 1)
            if flicker < 0.05 and count > 3:
                logger.info("Camera %d: Fire candidate rejected \u2014 static red object (flicker=%.3f)", camera_id, flicker)
            else:
                xs, ys = np.where(fire_mask > 0)
                x1, y1 = int(ys.min()), int(xs.min())
                x2, y2 = int(ys.max()), int(xs.max())
                ratio = fire_px / total_px
                confidence = round(min(0.95, 0.45 + ratio * 5.0), 3)
                detections.append(Detection(
                    camera_id=camera_id,
                    incident_type="Fire",
                    confidence=confidence,
                    bbox=[x1, y1, x2, y2],
                    timestamp=time.time(),
                ))
                logger.info("Camera %d: Fire detected, %.2f%% of frame, conf=%.3f", camera_id, ratio * 100, confidence)
        else:
            self._prev_fire_px[camera_id] = 0
            self._frame_count[camera_id] = 0

        # --- Smoke detection ---
        smoke_mask = cv2.inRange(hsv, self.SMOKE_LOWER, self.SMOKE_UPPER)
        smoke_mask = cv2.erode(smoke_mask, None, iterations=2)
        smoke_mask = cv2.dilate(smoke_mask, None, iterations=1)
        smoke_px = cv2.countNonZero(smoke_mask)
        if smoke_px / total_px > self.SMOKE_MIN_PCT:
            if self._is_vehicle_false_positive(smoke_mask, yolo_detections, (h, w)):
                logger.info("Camera %d: Smoke candidate rejected \u2014 overlaps with vehicle", camera_id)
            else:
                # Motion check: smoke billows and changes shape; static white objects don't
                prev = self._prev_smoke_px.get(camera_id, 0)
                count = self._smoke_frame_count.get(camera_id, 0) + 1
                self._smoke_frame_count[camera_id] = count
                self._prev_smoke_px[camera_id] = smoke_px
                smoke_change = abs(smoke_px - prev) / max(smoke_px, prev, 1)
                if smoke_change < 0.05 and count > 3:
                    logger.info("Camera %d: Smoke candidate rejected \u2014 static white object (change=%.3f)", camera_id, smoke_change)
                else:
                    xs, ys = np.where(smoke_mask > 0)
                    x1, y1 = int(ys.min()), int(xs.min())
                    x2, y2 = int(ys.max()), int(xs.max())
                    ratio = smoke_px / total_px
                    confidence = round(min(0.90, 0.45 + ratio * 4.0), 3)
                    detections.append(Detection(
                        camera_id=camera_id,
                        incident_type="Smoke",
                        confidence=confidence,
                        bbox=[x1, y1, x2, y2],
                        timestamp=time.time(),
                    ))
                    logger.info("Camera %d: Smoke detected, %.2f%% of frame, conf=%.3f", camera_id, ratio * 100, confidence)
        else:
            self._prev_smoke_px[camera_id] = 0
            self._smoke_frame_count[camera_id] = 0

        return detections

    def _is_vehicle_false_positive(self, mask: np.ndarray, yolo_detections: List[Detection] | None, frame_shape: tuple) -> bool:
        if not yolo_detections:
            return False
        h, w = frame_shape[:2]
        vehicle_types = {"Car", "Truck", "Bus", "Motorcycle"}
        for d in yolo_detections:
            if d.incident_type not in vehicle_types:
                continue
            x1, y1, x2, y2 = map(int, d.bbox)
            x1 = max(0, x1); y1 = max(0, y1)
            x2 = min(w, x2); y2 = min(h, y2)
            if x2 <= x1 or y2 <= y1:
                continue
            vehicle_region = mask[y1:y2, x1:x2]
            vehicle_area = (x2 - x1) * (y2 - y1)
            overlap = cv2.countNonZero(vehicle_region) / vehicle_area
            if overlap > self.VEHICLE_OVERLAP_THRESHOLD:
                return True
        return False
