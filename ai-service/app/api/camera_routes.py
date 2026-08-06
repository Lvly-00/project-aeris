"""Camera lifecycle routes — register, deregister, pause, resume, restart, list."""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from ..core.security import require_api_key
from ..core.camera_manager import CameraManager
from ..schemas.requests import CameraRegisterRequest

router = APIRouter(prefix="/cameras", tags=["cameras"])

_manager = CameraManager()


@router.post("/register")
def register_camera(
    request: CameraRegisterRequest,
    _: str = Depends(require_api_key),
):
    """Register a camera for AI processing (starts frame reader + detection worker)."""
    success = _manager.register_camera(request.camera_id, request.source, request.stream_type)
    if success:
        return {"status": "connected", "camera_id": request.camera_id}
    return JSONResponse(
        status_code=400,
        content={"status": "error", "message": f"Failed to connect to stream: {request.source}"},
    )


@router.post("/{camera_id}/deregister")
def deregister_camera(camera_id: int, _: str = Depends(require_api_key)):
    """Remove a camera from AI processing."""
    _manager.deregister_camera(camera_id)
    return {"status": "removed", "camera_id": camera_id}


@router.post("/{camera_id}/pause")
def pause_camera(camera_id: int, _: str = Depends(require_api_key)):
    """Pause detection for a camera (frame reading continues)."""
    _manager.pause_camera(camera_id)
    return {"status": "paused", "camera_id": camera_id}


@router.post("/{camera_id}/resume")
def resume_camera(camera_id: int, _: str = Depends(require_api_key)):
    """Resume detection for a camera."""
    _manager.resume_camera(camera_id)
    return {"status": "resumed", "camera_id": camera_id}


@router.post("/{camera_id}/restart")
def restart_camera(camera_id: int, _: str = Depends(require_api_key)):
    """Restart a camera with its existing configuration."""
    success = _manager.restart_camera(camera_id)
    return {"status": "restarted" if success else "failed", "camera_id": camera_id}


@router.get("")
def list_cameras(_: str = Depends(require_api_key)):
    """List all registered cameras with their status."""
    return _manager.get_all_cameras()
