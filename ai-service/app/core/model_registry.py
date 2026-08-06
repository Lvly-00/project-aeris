"""
Model Registry — singleton for YOLOv11 model loading.
Renamed from model_loader.py per refactoring brief §3.
Supports GPU/CPU device selection with automatic fallback.
"""
import logging
import os
from threading import Lock

from ultralytics import YOLO
from decouple import config

logger = logging.getLogger(__name__)


class ModelRegistry:
    """Singleton that loads and holds the YOLO model + configuration.

    Reads DEVICE from the environment and actually applies it.
    Falls back to CPU automatically when CUDA is unavailable.
    """

    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.model_path: str = config("YOLO_MODEL_PATH", default="yolo11n.pt")
        if not os.path.isabs(self.model_path):
            self.model_path = os.path.join(os.getcwd(), self.model_path)

        self.device: str = config("DEVICE", default="cpu")
        self.conf_threshold: float = float(config("DEFAULT_CONF_THRESHOLD", default="0.3"))
        self.iou_threshold: float = float(config("IOU_THRESHOLD", default="0.5"))

        self.model = None
        self.load_model()

    def load_model(self):
        """Load YOLOv11 model with proper device support and CUDA fallback."""
        try:
            logger.info("Loading YOLO model from %s (requested device: %s)", self.model_path, self.device)

            # Validate requested device
            if self.device.startswith("cuda"):
                try:
                    import torch
                    if not torch.cuda.is_available():
                        logger.warning(
                            "CUDA requested but torch.cuda.is_available()=False — falling back to CPU"
                        )
                        self.device = "cpu"
                except ImportError:
                    logger.warning("PyTorch not installed — falling back to CPU")
                    self.device = "cpu"

            # Load model
            self.model = YOLO(self.model_path)

            # Attempt to move model to the target device
            if self.device != "cpu" and hasattr(self.model, "to"):
                try:
                    self.model.to(self.device)
                    logger.info("Model moved to %s", self.device)
                except Exception as e:
                    logger.warning("Failed to move model to %s: %s — using CPU", self.device, e)
                    self.device = "cpu"

            logger.info("Model loaded successfully on %s", self.device)

        except Exception as e:
            logger.error("Failed to load YOLO model: %s", e)
            self.model = None

    def get_model(self):
        return self.model

    def get_conf_threshold(self) -> float:
        return self.conf_threshold

    def set_conf_threshold(self, threshold: float):
        self.conf_threshold = max(0.0, min(1.0, threshold))

    def get_iou_threshold(self) -> float:
        return self.iou_threshold

    def set_iou_threshold(self, threshold: float):
        self.iou_threshold = max(0.0, min(1.0, threshold))
