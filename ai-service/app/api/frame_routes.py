"""
Frame access routes — intentionally unauthenticated.

/cameras/{id}/frame  is polled by the frontend canvas every ~33 ms.
/stream/{id}/video   is an MJPEG stream consumed by the frontend.
Adding auth here would require every <img> and canvas fetch to carry a header,
which is not feasible for browser media elements.
Network-level access control (nginx, Docker network) is the guard instead.
"""
import asyncio
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse

from ..core.camera_manager import CameraManager

router = APIRouter(tags=["frames"])

_manager = CameraManager()


@router.get("/cameras/{camera_id}/frame")
async def get_camera_frame(camera_id: int):
    """Return the latest JPEG frame for a camera (no auth — canvas polling)."""
    _manager.try_auto_register(camera_id)
    jpeg = _manager.get_jpeg(camera_id)
    if jpeg is None:
        for _ in range(10):
            await asyncio.sleep(0.2)
            jpeg = _manager.get_jpeg(camera_id)
            if jpeg is not None:
                break
    if jpeg is None:
        raise HTTPException(status_code=404, detail="No frame available")
    return Response(content=jpeg, media_type="image/jpeg")


@router.get("/stream/{camera_id}/video")
def stream_video(camera_id: int):
    """MJPEG stream for a camera (no auth — consumed as <img src>)."""
    _manager.try_auto_register(camera_id)

    def generate():
        while True:
            jpeg = _manager.get_jpeg(camera_id)
            if jpeg is not None:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
                )
            time.sleep(0.033)

    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")
