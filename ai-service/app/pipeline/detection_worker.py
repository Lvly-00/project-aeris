"""
Detection Worker - Background thread that continuously runs YOLO inference.
Processes the latest frame from FrameReader and stores results in DetectionCache.
Implements frame skipping and configurable detection FPS.
"""
import logging
import threading
import time
from typing import Optional

import numpy as np

from ..config import FRAME_SKIP, DETECTION_FPS
from .frame_reader import FrameReader
from .frame_processor import FrameProcessor
from ..models.yolo_detector import YOLODetector, Detection
from ..models.fire_detector import SimpleFireDetector
from ..models.accident_detector import AccidentDetector
from ..core.confidence_filter import ConfidenceFilter
from ..core.detection_cache import DetectionCache

logger = logging.getLogger(__name__)


class DetectionWorker:
    """Runs YOLO + HSV detection in a background thread for a single camera.

    Continuously grabs the latest frame from the FrameReader, runs inference,
    and stores results in the DetectionCache. Never blocks API endpoints.
    """

    def __init__(
        self,
        camera_id: int,
        frame_reader: FrameReader,
        cache: DetectionCache,
        detector: Optional[YOLODetector],
        fire_detector: SimpleFireDetector,
        accident_detector: AccidentDetector,
        confidence_filter: ConfidenceFilter,
        frame_skip: int = FRAME_SKIP,
        detection_fps: float = DETECTION_FPS,
    ):
        self.camera_id = camera_id
        self._frame_reader = frame_reader
        self._cache = cache
        self._detector = detector
        self._fire_detector = fire_detector
        self._accident_detector = accident_detector
        self._confidence_filter = confidence_filter

        self._frame_skip = frame_skip
        self._detection_fps = detection_fps
        self._frame_processor = FrameProcessor()

        self._running = False
        self._paused = False
        self._thread: Optional[threading.Thread] = None
        self._pause_event = threading.Event()
        self._pause_event.set()

        self._accident_streak = 0
        self._frame_count = 0

        # Performance stats
        self._inference_count = 0
        self._total_inference_time_ms = 0.0
        self._avg_inference_time_ms = 0.0
        self._last_inference_time: Optional[float] = None

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def is_paused(self) -> bool:
        return self._paused

    @property
    def avg_inference_time_ms(self) -> float:
        return self._avg_inference_time_ms

    @property
    def last_inference_time(self) -> Optional[float]:
        return self._last_inference_time

    @property
    def inference_count(self) -> int:
        return self._inference_count

    def start(self):
        """Start the detection worker thread."""
        if self._running:
            return
        self._running = True
        self._paused = False
        self._pause_event.set()
        self._thread = threading.Thread(
            target=self._run,
            name=f"detection-worker-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()
        logger.info(
            "Camera %d: Detection worker started (skip=%d, target_fps=%.1f, device=%s)",
            self.camera_id, self._frame_skip, self._detection_fps,
            "gpu" if self._detector else "none",
        )

    def stop(self):
        """Stop the detection worker thread."""
        self._running = False
        self._paused = False
        self._pause_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        logger.info("Camera %d: Detection worker stopped", self.camera_id)

    def pause(self):
        """Pause detection (frame reading continues)."""
        if not self._paused:
            self._paused = True
            self._pause_event.clear()
            logger.info("Camera %d: Detection worker paused", self.camera_id)

    def resume(self):
        """Resume detection."""
        if self._paused:
            self._paused = False
            self._pause_event.set()
            logger.info("Camera %d: Detection worker resumed", self.camera_id)

    def _run(self):
        """Main detection loop."""
        min_interval = 1.0 / self._detection_fps if self._detection_fps > 0 else 0.2

        while self._running:
            self._pause_event.wait()
            if not self._running:
                break

            loop_start = time.time()

            try:
                self._process_frame()
            except Exception as e:
                logger.error("Camera %d: Detection error: %s", self.camera_id, e, exc_info=True)

            elapsed = time.time() - loop_start
            sleep_time = max(0, min_interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)

    def _process_frame(self):
        """Grab the latest frame and run the full detection pipeline."""
        if self._detector is None:
            return

        frame = self._frame_reader.get_frame()
        if frame is None:
            return

        self._frame_count += 1

        # Frame skipping: only process every (FRAME_SKIP+1)-th frame
        if self._frame_count % (self._frame_skip + 1) != 0:
            return

        # Preprocess (resize + pad to model input size)
        processed = self._frame_processor.preprocess(frame)
        if processed is None:
            return

        # YOLO inference
        start_time = time.time()
        yolo_detections = self._detector.detect(processed, self.camera_id)
        inference_time_ms = (time.time() - start_time) * 1000

        # Confidence filtering (per-type thresholds + temporal dedup)
        filtered = self._confidence_filter.filter(yolo_detections)

        # HSV-based fire / smoke detection
        fire_obs = self._fire_detector.detect(processed, self.camera_id, filtered)

        # Apply same confidence threshold to HSV detections
        fire_obs = self._confidence_filter.filter(fire_obs)

        # Custom accident model inference (replaces heuristic vehicle overlap)
        accident_detections = self._accident_detector.detect(processed, self.camera_id)

        # Filter accident detections through the confidence filter
        filtered_accidents = self._confidence_filter.filter(accident_detections)

        # Temporal streak confirmation: require consecutive frames
        if filtered_accidents:
            self._accident_streak += 1
            if self._accident_streak < 2:
                logger.info(
                    "Camera %d: Vehicle_Accident pending — streak=%d",
                    self.camera_id, self._accident_streak,
                )
                filtered_accidents = []
        else:
            self._accident_streak = 0

        all_detections = filtered + fire_obs + filtered_accidents

        # Remap bounding boxes from padded 640x640 coords to original frame coords
        for d in all_detections:
            d.bbox = self._frame_processor.remap_bbox(d.bbox)

        # Store in cache
        h, w = frame.shape[:2]
        self._cache.update(
            self.camera_id,
            all_detections,
            inference_time_ms,
            frame_width=w,
            frame_height=h,
        )

        # Update stats
        self._inference_count += 1
        self._total_inference_time_ms += inference_time_ms
        self._avg_inference_time_ms = self._total_inference_time_ms / self._inference_count
        self._last_inference_time = time.time()

        if all_detections:
            types = [d.incident_type for d in all_detections]
            logger.info(
                "Camera %d: %d detections %s in %.1fms",
                self.camera_id, len(all_detections), types, inference_time_ms,
            )


