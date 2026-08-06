"""
Frame Reader - Dedicated thread for reading frames from video streams.
Only reads frames, never performs inference.
Handles RTSP/HTTP streams with automatic reconnection.
Supports uploaded frames for HTTP/MP4 cameras.
"""
import cv2
import logging
import threading
import time
from typing import Optional
from enum import Enum

from ..config import RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY

logger = logging.getLogger(__name__)


class ReaderState(Enum):
    IDLE = "idle"
    CONNECTING = "connecting"
    RUNNING = "running"
    RECONNECTING = "reconnecting"
    STOPPED = "stopped"


class FrameReader:
    """Reads frames from a video source in a dedicated background thread.

    For RTSP/HTTP sources, continuously reads from cv2.VideoCapture.
    For uploaded frames (HTTP/MP4 cameras), accepts frames pushed from the API.
    """

    def __init__(self, camera_id: int, source: str, stream_type: str = "RTSP"):
        self.camera_id = camera_id
        self.source = source
        self.stream_type = stream_type

        self._state = ReaderState.IDLE
        self._running = False
        self._thread: Optional[threading.Thread] = None

        self._cap: Optional[cv2.VideoCapture] = None
        self._cap_lock = threading.Lock()

        self._frame_lock = threading.Lock()
        self._latest_frame = None
        self._latest_jpeg: Optional[bytes] = None
        self._frame_event = threading.Event()

        self._frame_count = 0
        self._fps = 0.0
        self._last_fps_time = time.time()
        self._fps_frame_count = 0
        self._width = 0
        self._height = 0
        self._last_frame_time: Optional[float] = None

        self._reconnect_delay = RECONNECT_BASE_DELAY

        # Uploaded frame buffer (for HTTP/MP4 cameras)
        self._uploaded_frame = None
        self._uploaded_lock = threading.Lock()

    @property
    def state(self) -> ReaderState:
        return self._state

    @property
    def fps(self) -> float:
        return self._fps

    @property
    def width(self) -> int:
        return self._width

    @property
    def height(self) -> int:
        return self._height

    @property
    def last_frame_time(self) -> Optional[float]:
        return self._last_frame_time

    @property
    def frame_count(self) -> int:
        return self._frame_count

    def start(self):
        """Start the frame reader background thread."""
        if self._running:
            return
        self._running = True
        self._state = ReaderState.CONNECTING
        self._thread = threading.Thread(
            target=self._run,
            name=f"frame-reader-{self.camera_id}",
            daemon=True,
        )
        self._thread.start()
        logger.info("Camera %d: Frame reader started (source=%s)", self.camera_id, self.source)

    def stop(self):
        """Stop the frame reader and release resources."""
        self._running = False
        self._state = ReaderState.STOPPED
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
        self._release_capture()
        logger.info("Camera %d: Frame reader stopped", self.camera_id)

    def get_frame(self):
        """Get the latest frame (non-blocking, returns a copy)."""
        with self._frame_lock:
            if self._latest_frame is not None:
                return self._latest_frame.copy()
        return None

    def get_jpeg(self) -> Optional[bytes]:
        """Get the latest JPEG-encoded frame bytes."""
        with self._frame_lock:
            return self._latest_jpeg

    def upload_frame(self, frame):
        """Upload a frame for HTTP/MP4 cameras (called from API endpoint)."""
        with self._uploaded_lock:
            self._uploaded_frame = frame
        self._frame_event.set()

    def _run(self):
        """Main loop dispatching to the appropriate reader strategy."""
        while self._running:
            try:
                if self.stream_type in ("RTSP", "HTTP"):
                    self._read_stream_loop()
                else:
                    self._wait_for_uploaded_frames()
            except Exception as e:
                logger.error("Camera %d: Frame reader error: %s", self.camera_id, e)
                self._state = ReaderState.RECONNECTING
                time.sleep(min(self._reconnect_delay, RECONNECT_MAX_DELAY))
                self._reconnect_delay = min(self._reconnect_delay * 2, RECONNECT_MAX_DELAY)

    def _open_capture(self, source: str) -> Optional[cv2.VideoCapture]:
        """Open a VideoCapture with timeouts to prevent indefinite blocking.

        Lets OpenCV auto-detect the best backend (FFMPEG, DSHOW, MSMF, etc.)
        instead of forcing CAP_FFMPEG which may not be available.
        """
        cap = cv2.VideoCapture(source)

        # Best-effort timeouts — only FFMPEG backend supports these,
        # silently ignored by other backends
        try:
            if self.stream_type == "RTSP":
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)
            else:
                cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
                cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
        except Exception:
            pass

        return cap

    def _read_stream_loop(self):
        """Read frames from an RTSP/HTTP stream with reconnection."""
        self._state = ReaderState.CONNECTING
        cap = self._open_capture(self.source)
        if not cap.isOpened():
            logger.error("Camera %d: Failed to open stream %s", self.camera_id, self.source)
            self._state = ReaderState.RECONNECTING
            return

        with self._cap_lock:
            self._cap = cap

        self._fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        self._width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self._height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self._state = ReaderState.RUNNING
        self._reconnect_delay = RECONNECT_BASE_DELAY
        logger.info(
            "Camera %d: Connected to %s (%dx%d @ %.1f fps)",
            self.camera_id, self.source, self._width, self._height, self._fps,
        )

        stale_count = 0
        while self._running:
            ret, frame = cap.read()
            if ret:
                stale_count = 0
                self._store_frame(frame)
                self._update_fps()
                time.sleep(0.005)
            else:
                stale_count += 1
                if stale_count < 3:
                    logger.warning("Camera %d: Frame read failed (stale %d), retrying...", self.camera_id, stale_count)
                    time.sleep(0.1)
                    continue
                logger.warning("Camera %d: Frame read failed %d times, reconnecting...", self.camera_id, stale_count)
                stale_count = 0
                self._release_capture()
                self._state = ReaderState.RECONNECTING
                time.sleep(min(self._reconnect_delay, RECONNECT_MAX_DELAY))
                self._reconnect_delay = min(self._reconnect_delay * 2, RECONNECT_MAX_DELAY)
                cap = self._open_capture(self.source)
                if cap.isOpened():
                    with self._cap_lock:
                        self._cap = cap
                    self._fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                    self._width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    self._height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    self._state = ReaderState.RUNNING
                    self._reconnect_delay = RECONNECT_BASE_DELAY
                    logger.info("Camera %d: Reconnected to %s", self.camera_id, self.source)
                else:
                    break

    def _wait_for_uploaded_frames(self):
        """Wait for frames pushed via upload_frame() (for HTTP/MP4 cameras)."""
        self._state = ReaderState.RUNNING
        logger.info("Camera %d: Waiting for uploaded frames", self.camera_id)

        while self._running:
            self._frame_event.wait(timeout=1.0)
            self._frame_event.clear()

            if not self._running:
                break

            with self._uploaded_lock:
                frame = self._uploaded_frame
                self._uploaded_frame = None

            if frame is not None:
                self._store_frame(frame)
                self._update_fps()

    def _store_frame(self, frame):
        """Store a frame as both raw and JPEG-encoded."""
        with self._frame_lock:
            self._latest_frame = frame
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
            self._latest_jpeg = buf.tobytes()
            self._frame_count += 1
            self._last_frame_time = time.time()
            self._frame_event.set()

    def _update_fps(self):
        """Calculate rolling FPS."""
        self._fps_frame_count += 1
        now = time.time()
        elapsed = now - self._last_fps_time
        if elapsed >= 1.0:
            self._fps = self._fps_frame_count / elapsed
            self._fps_frame_count = 0
            self._last_fps_time = now

    def _release_capture(self):
        """Release the VideoCapture object safely."""
        with self._cap_lock:
            if self._cap is not None:
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None
