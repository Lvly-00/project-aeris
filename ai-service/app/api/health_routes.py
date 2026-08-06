"""Health routes — unauthenticated, used by monitoring and Docker health checks."""
from fastapi import APIRouter
from ..core.health import get_system_health, get_camera_health

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """System health: CPU, memory, model status, camera counts."""
    return get_system_health()


@router.get("/cameras/{camera_id}/status")
def camera_status(camera_id: int):
    """Per-camera health: connected, detecting, FPS, inference stats."""
    return get_camera_health(camera_id)
