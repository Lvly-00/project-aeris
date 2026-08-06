"""
Camera Manager - Singleton that manages the full lifecycle of cameras.
Orchestrates FrameReaders, DetectionWorkers, and the DetectionCache.
API endpoints never touch YOLO directly; they go through CameraManager.
"""
import logging
import threading
import time
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

import requests as http_requests

from ..config import BACKEND_API_URL, FRAME_SKIP, DETECTION_FPS, INTERNAL_API_KEY
from ..pipeline.frame_reader import FrameReader, ReaderState
from ..pipeline.detection_worker import DetectionWorker
from ..core.detection_cache import DetectionCache, CachedDetection
from ..core.model_registry import ModelRegistry
from ..models.yolo_detector import YOLODetector
from ..models.fire_detector import SimpleFireDetector
from ..models.accident_detector import AccidentDetector
from ..core.confidence_filter import ConfidenceFilter

logger = logging.getLogger(__name__)


class CameraStatus(Enum):
    REGISTERED = "registered"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DETECTING = "detecting"
    PAUSED = "paused"
    DISCONNECTED = "disconnected"
    ERROR = "error"


@dataclass
class CameraState:
    """Internal state for a single managed camera."""
    camera_id: int
    source: str
    stream_type: str
    status: CameraStatus
    frame_reader: FrameReader
    detection_worker: DetectionWorker
    registered_at: float


class CameraManager:
    """Singleton manager for all camera operations.

    Provides register / deregister / pause / resume / restart /
    update lifecycle, frame access, and detection cache access.
    All camera threads (frame readers + detection workers) are
    managed internally — API code never spawns threads directly.
    """

    _instance = None
    _class_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._class_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self._cameras: Dict[int, CameraState] = {}
        self._cameras_lock = threading.RLock()

        # Shared detection components (model is singleton)
        model_loader = ModelRegistry()
        model = model_loader.get_model()
        self._detector: Optional[YOLODetector] = (
            YOLODetector(model, model_loader.get_conf_threshold()) if model else None
        )
        self._fire_detector = SimpleFireDetector()
        self._accident_detector = AccidentDetector()
        self._confidence_filter = ConfidenceFilter()
        self._cache = DetectionCache()

        # Auto-registration bookkeeping
        self._auto_registered: set = set()
        self._auto_register_locks: Dict[int, threading.Lock] = {}
        self._auto_register_lock = threading.Lock()

        logger.info(
            "CameraManager initialised (detector=%s, accident_detector=%s)",
            "ready" if self._detector else "not loaded",
            "ready" if self._accident_detector.is_loaded else "not loaded",
        )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def cache(self) -> DetectionCache:
        return self._cache

    @property
    def detector(self) -> Optional[YOLODetector]:
        return self._detector

    @property
    def confidence_filter(self) -> ConfidenceFilter:
        return self._confidence_filter

    # ------------------------------------------------------------------
    # Camera lifecycle
    # ------------------------------------------------------------------

    def register_camera(self, camera_id: int, source: str, stream_type: str = "RTSP") -> bool:
        """Register a camera and start its frame reader + detection worker."""
        with self._cameras_lock:
            if camera_id in self._cameras:
                logger.info("Camera %d: Re-registering (stopping old instance)", camera_id)
                self._stop_camera_locked(camera_id)

            frame_reader = FrameReader(camera_id, source, stream_type)
            detection_worker = DetectionWorker(
                camera_id=camera_id,
                frame_reader=frame_reader,
                cache=self._cache,
                detector=self._detector,
                fire_detector=self._fire_detector,
                accident_detector=self._accident_detector,
                confidence_filter=self._confidence_filter,
            )
            state = CameraState(
                camera_id=camera_id,
                source=source,
                stream_type=stream_type,
                status=CameraStatus.CONNECTING,
                frame_reader=frame_reader,
                detection_worker=detection_worker,
                registered_at=time.time(),
            )
            self._cameras[camera_id] = state

        # Start threads outside the lock to avoid deadlocks
        frame_reader.start()
        detection_worker.start()

        with self._cameras_lock:
            if camera_id in self._cameras:
                self._cameras[camera_id].status = CameraStatus.DETECTING

        logger.info("Camera %d: Registered and started", camera_id)
        return True

    def deregister_camera(self, camera_id: int):
        """Remove a camera and stop all associated threads."""
        with self._cameras_lock:
            self._stop_camera_locked(camera_id)
            self._cameras.pop(camera_id, None)
        self._cache.remove(camera_id)
        logger.info("Camera %d: Deregistered", camera_id)

    def pause_camera(self, camera_id: int):
        """Pause detection for a camera (frame reading continues)."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
            if state:
                state.detection_worker.pause()
                state.status = CameraStatus.PAUSED

    def resume_camera(self, camera_id: int):
        """Resume detection for a camera."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
            if state:
                state.detection_worker.resume()
                state.status = CameraStatus.DETECTING

    def restart_camera(self, camera_id: int) -> bool:
        """Stop then restart a camera with its existing configuration."""
        source = None
        stream_type = None
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
            if state:
                source = state.source
                stream_type = state.stream_type
                self._stop_camera_locked(camera_id)
                del self._cameras[camera_id]

        if source is not None:
            return self.register_camera(camera_id, source, stream_type)
        return False

    def update_camera(self, camera_id: int, new_source: str, new_stream_type: str = "RTSP") -> bool:
        """Update camera configuration safely (stop → update → restart)."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
            if state:
                self._stop_camera_locked(camera_id)
                del self._cameras[camera_id]
        return self.register_camera(camera_id, new_source, new_stream_type)

    # ------------------------------------------------------------------
    # Frame upload (for HTTP/MP4 cameras via /detect/frame)
    # ------------------------------------------------------------------

    def upload_frame(self, camera_id: int, frame) -> bool:
        """Push a frame into the camera's frame reader buffer."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
        if state is None:
            return False
        state.frame_reader.upload_frame(frame)
        return True

    # ------------------------------------------------------------------
    # Auto-registration from Django backend
    # ------------------------------------------------------------------

    def try_auto_register(self, camera_id: int) -> bool:
        """Auto-register a camera by fetching its RTSP URL from Django."""
        if camera_id in self._auto_registered:
            return True
        if camera_id in self._cameras:
            with self._auto_register_lock:
                self._auto_registered.add(camera_id)
            return True

        with self._auto_register_lock:
            if camera_id in self._auto_registered:
                return True
            if camera_id not in self._auto_register_locks:
                self._auto_register_locks[camera_id] = threading.Lock()

        cam_lock = self._auto_register_locks[camera_id]
        with cam_lock:
            if camera_id in self._auto_registered:
                return True
            try:
                url = f"{BACKEND_API_URL.rsplit('/api', 1)[0]}/internal/cameras/{camera_id}/"
                # Use the config-loaded key (reads from .env via python-decouple)
                internal_key = INTERNAL_API_KEY or AI_SERVICE_API_KEY
                resp = http_requests.get(
                    url,
                    headers={"X-Internal-Key": internal_key},
                    timeout=5,
                )
                if resp.status_code != 200:
                    return False
                cam = resp.json()
                rtsp_url = cam.get("rtsp_url", "")
                stream_type = cam.get("stream_type", "RTSP")
                if not rtsp_url:
                    return False
                success = self.register_camera(camera_id, rtsp_url, stream_type)
                if success:
                    with self._auto_register_lock:
                        self._auto_registered.add(camera_id)
                    logger.info("Camera %d: Auto-registered (%s)", camera_id, rtsp_url)
                return success
            except Exception as e:
                logger.warning("Camera %d: Auto-register failed: %s", camera_id, e)
                return False

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_frame(self, camera_id: int):
        """Get the latest frame from a camera."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
        if state is None:
            return None
        return state.frame_reader.get_frame()

    def get_jpeg(self, camera_id: int) -> Optional[bytes]:
        """Get the latest JPEG frame from a camera."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
        if state is None:
            return None
        return state.frame_reader.get_jpeg()

    def get_detection(self, camera_id: int) -> Optional[CachedDetection]:
        """Get the latest cached detection for a camera."""
        return self._cache.get(camera_id)

    def get_camera_status(self, camera_id: int) -> Optional[dict]:
        """Return detailed status dict for a single camera."""
        with self._cameras_lock:
            state = self._cameras.get(camera_id)
        if state is None:
            return None

        fr = state.frame_reader
        dw = state.detection_worker
        return {
            "camera_id": camera_id,
            "source": state.source,
            "stream_type": state.stream_type,
            "status": state.status.value,
            "connected": fr.state in (ReaderState.RUNNING, ReaderState.CONNECTED),
            "detecting": dw.is_running and not dw.is_paused,
            "fps": round(fr.fps, 1),
            "resolution": f"{fr.width}x{fr.height}",
            "frame_count": fr.frame_count,
            "last_frame_time": fr.last_frame_time,
            "detection_count": dw.inference_count,
            "avg_inference_time_ms": round(dw.avg_inference_time_ms, 1),
            "last_detection_time": dw.last_inference_time,
            "registered_at": state.registered_at,
        }

    def get_all_cameras(self) -> List[dict]:
        """Return status dicts for all registered cameras."""
        with self._cameras_lock:
            ids = list(self._cameras.keys())
        return [self.get_camera_status(cid) for cid in ids]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _stop_camera_locked(self, camera_id: int):
        """Stop a camera's threads (must hold _cameras_lock)."""
        state = self._cameras.get(camera_id)
        if state is None:
            return
        try:
            state.detection_worker.stop()
        except Exception as e:
            logger.error("Camera %d: Error stopping detection worker: %s", camera_id, e)
        try:
            state.frame_reader.stop()
        except Exception as e:
            logger.error("Camera %d: Error stopping frame reader: %s", camera_id, e)

    def shutdown(self):
        """Gracefully stop all cameras."""
        logger.info("CameraManager: Shutting down all cameras...")
        with self._cameras_lock:
            for camera_id in list(self._cameras.keys()):
                self._stop_camera_locked(camera_id)
            self._cameras.clear()
        self._cache.clear()
        logger.info("CameraManager: Shutdown complete")
