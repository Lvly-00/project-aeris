"""
Health Monitoring - System health and camera status endpoints.
Provides CPU, memory, model, and per-camera diagnostics.
"""
import logging
import threading
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

_start_time = time.time()

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False


def get_system_health() -> Dict[str, Any]:
    """Build a system health response dict."""
    from ..core.camera_manager import CameraManager
    from ..core.model_registry import ModelRegistry

    cpu_percent = 0.0
    memory_info: Dict[str, Any] = {"percent": 0.0, "used_mb": 0.0, "total_mb": 0.0}

    if _HAS_PSUTIL:
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            mem = psutil.virtual_memory()
            memory_info = {
                "percent": round(mem.percent, 1),
                "used_mb": round(mem.used / (1024 * 1024), 1),
                "total_mb": round(mem.total / (1024 * 1024), 1),
            }
        except Exception:
            pass

    manager = CameraManager()
    model_loader = ModelRegistry()
    cameras = manager.get_all_cameras()
    active_cameras = len([c for c in cameras if c and c.get("detecting")])

    return {
        "status": "healthy",
        "service": "ai-detection-service",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "cpu_percent": round(cpu_percent, 1),
        "memory": memory_info,
        "cameras": {
            "total": len(cameras),
            "active": active_cameras,
        },
        "model": {
            "loaded": model_loader.get_model() is not None,
            "device": model_loader.device,
            "path": model_loader.model_path,
            "confidence_threshold": model_loader.get_conf_threshold(),
        },
        "thread_count": threading.active_count(),
    }


def get_camera_health(camera_id: int) -> Dict[str, Any]:
    """Build a per-camera health response dict."""
    from .camera_manager import CameraManager

    manager = CameraManager()
    status = manager.get_camera_status(camera_id)
    if status is None:
        return {"camera_id": camera_id, "status": "not_registered"}

    cached = manager.cache.get(camera_id)
    status["cached_detection_count"] = len(cached.detections) if cached else 0
    status["cache_age_seconds"] = (
        round(time.time() - cached.timestamp, 2) if cached else None
    )
    return status
