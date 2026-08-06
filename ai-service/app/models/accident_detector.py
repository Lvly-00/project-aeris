"""
Accident Detector - Loads the fine-tuned accident YOLO model and runs inference.
Returns Detection objects mapped to Vehicle_Accident incident type.
"""
import logging
import os
import time
from typing import List, Optional
from threading import Lock

import numpy as np
from ultralytics import YOLO

from ..models.yolo_detector import Detection
from ..config import ACCIDENT_MODEL_PATH

logger = logging.getLogger(__name__)

# Model maps both 'accident' and 'vehicle_accident' classes to this type
INCIDENT_TYPE = "Vehicle_Accident"

# Thresholds
DEFAULT_CONF = 0.35
TEMPORAL_STREAK_MIN = 2  # require N consecutive positive frames


class AccidentDetector:
    """Loads and runs the fine-tuned accident YOLO model.

    Returns a list of Detection objects with incident_type='Vehicle_Accident'.
    Thread-safe — can be shared across DetectionWorker instances.
    """

    _instance = None
    _lock = Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        conf_threshold: float = DEFAULT_CONF,
    ):
        if self._initialized:
            return
        self._initialized = True

        if model_path is None:
            model_path = ACCIDENT_MODEL_PATH
        if not os.path.isabs(model_path):
            model_path = os.path.join(os.getcwd(), model_path)

        self._model_path = model_path
        self._device = device or "cpu"
        self._conf_threshold = conf_threshold
        self._model: Optional[YOLO] = None

        self._load()

    def _load(self):
        """Load the accident YOLO model with GPU/CPU fallback."""
        try:
            if not os.path.exists(self._model_path):
                logger.warning("Accident model not found at %s — detector disabled", self._model_path)
                return

            if self._device.startswith("cuda"):
                try:
                    import torch
                    if not torch.cuda.is_available():
                        logger.warning("CUDA unavailable for accident model — falling back to CPU")
                        self._device = "cpu"
                except ImportError:
                    self._device = "cpu"

            self._model = YOLO(self._model_path)

            if self._device != "cpu" and hasattr(self._model, "to"):
                try:
                    self._model.to(self._device)
                except Exception as e:
                    logger.warning("Failed to move accident model to %s: %s — using CPU", self._device, e)
                    self._device = "cpu"

            logger.info(
                "Accident model loaded from %s (device=%s, conf=%.2f)",
                self._model_path, self._device, self._conf_threshold,
            )
        except Exception as e:
            logger.error("Failed to load accident model: %s", e)
            self._model = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def detect(self, frame: np.ndarray, camera_id: int) -> List[Detection]:
        """Run accident detection on a preprocessed frame.

        Returns a list of Detection objects with incident_type='Vehicle_Accident'.
        """
        if self._model is None or frame is None:
            return []

        start = time.time()
        try:
            results = self._model(frame, conf=self._conf_threshold, verbose=False)
        except Exception as e:
            logger.error("Accident model inference error: %s", e)
            return []

        inference_ms = (time.time() - start) * 1000

        detections: List[Detection] = []
        if not results:
            return detections

        result = results[0]
        if result.boxes is None or len(result.boxes) == 0:
            return detections

        timestamp = time.time()
        boxes = result.boxes

        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].tolist()
            conf = float(boxes.conf[i])

            detections.append(
                Detection(
                    camera_id=camera_id,
                    incident_type=INCIDENT_TYPE,
                    confidence=round(conf, 3),
                    bbox=xyxy,
                    timestamp=timestamp,
                )
            )

        if detections:
            logger.info(
                "Camera %d: Accident model found %d detections in %.1fms",
                camera_id, len(detections), inference_ms,
            )

        return detections
