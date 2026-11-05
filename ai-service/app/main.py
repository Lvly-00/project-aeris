"""
AI Service entry point.

App factory: creates the FastAPI app, mounts all routers,
registers startup/shutdown lifecycle events.

Run directly:
    python -m app.main

Run via uvicorn (production):
    uvicorn app.main:app --host 0.0.0.0 --port 8005
"""
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.types import ASGIApp, Receive, Scope, Send
from decouple import config

from .api.health_routes import router as health_router
from .api.camera_routes import router as camera_router
from .api.frame_routes import router as frame_router
from .api.detect_routes import router as detect_router
from .config import AI_SERVICE_API_KEY, BACKEND_API_URL, INTERNAL_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ForceApiKeyMiddleware:
    """ASGI middleware that rewrites X-API-Key on every HTTP request.

    Mirrors what nginx (``proxy_set_header X-API-Key ...``) and Django's
    ai_proxy do server-side: clients behind a trusted same-origin entry point
    are not trusted with the service key themselves. The bundled desktop build
    reaches the AI through this /ai sub-app, so the key is injected here.
    """

    def __init__(self, app: ASGIApp, api_key: str = "") -> None:
        self.app = app
        self.api_key = api_key.encode("utf-8") if api_key else None

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if self.api_key is not None and scope["type"] == "http":
            headers = [
                (k, v) for (k, v) in scope.get("headers") or [] if k.lower() != b"x-api-key"
            ]
            headers.append((b"x-api-key", self.api_key))
            scope["headers"] = headers
        await self.app(scope, receive, send)


def _frontend_dist_dir() -> Path:
    """Directory containing the built SPA, serviceable by this process.

    Frozen (PyInstaller sidecar): <exe-dir>/frontend/dist — staged beside the
    executable by the build script and served as the app origin.
    Otherwise: <repo-root>/frontend/dist. Override with AI_FRONTEND_DIR.
    """
    import sys
    configured = (config("AI_FRONTEND_DIR", default="") or "").strip()
    if configured:
        return Path(configured).expanduser()
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent / "frontend" / "dist"
    # <repo-root>/frontend/dist  (main.py lives at <repo-root>/ai-service/app/)
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


def _auto_register_cameras():
    """
    Called once at startup in a background thread.

    Fetches every active camera from Django and registers it with the
    CameraManager so detection starts without waiting for a user to open
    the camera monitoring page.

    - RTSP/HTTP cameras → registered as streaming sources; FrameReader pulls
      frames autonomously.
    - MP4 cameras → registered in uploaded-frame mode; a companion loop reads
      the file with cv2.VideoCapture and feeds frames into the worker, looping
      forever so the test file acts like a live stream.

    Non-fatal errors are logged and skipped — a missing model or unreachable
    backend should not prevent the rest of startup from completing.
    """
    import time
    import requests

    # Wait briefly for the Django backend to be reachable.
    django_root = BACKEND_API_URL.rstrip("/")
    if django_root.endswith("/api"):
        django_root = django_root[:-4]
    cameras_url = f"{django_root}/internal/cameras/list/"
    internal_key = INTERNAL_API_KEY or AI_SERVICE_API_KEY

    for attempt in range(10):
        try:
            resp = requests.get(
                cameras_url,
                headers={"X-Internal-Key": internal_key},
                timeout=5,
            )
            if resp.status_code == 200:
                cameras = resp.json()
                break
            logger.warning("Camera list returned %d, retrying…", resp.status_code)
        except requests.exceptions.ConnectionError:
            logger.info("Backend not reachable yet (attempt %d/10), waiting…", attempt + 1)
        except Exception as exc:
            logger.warning("Error fetching camera list: %s", exc)
        time.sleep(3)
    else:
        logger.warning("Could not fetch camera list from backend — skipping auto-registration")
        return

    from .core.camera_manager import CameraManager
    manager = CameraManager()

    import threading
    for cam in cameras:
        cam_id = cam.get("id")
        stream_url = cam.get("stream_url") or ""
        stream_type = (cam.get("stream_type") or "RTSP").upper()
        is_active = cam.get("is_active", True)

        if not cam_id or not is_active or not stream_url:
            continue

        if stream_type in ("RTSP", "HTTP"):
            try:
                manager.register_camera(cam_id, stream_url, stream_type)
                logger.info("Auto-registered camera %d (%s)", cam_id, stream_type)
            except Exception as exc:
                logger.warning("Failed to register camera %d: %s", cam_id, exc)

        elif stream_type == "MP4":
            try:
                # Register in uploaded-frame mode (FrameReader will wait for frames).
                manager.register_camera(cam_id, stream_url, "MP4")
                logger.info("Auto-registered MP4 camera %d (file=%s)", cam_id, stream_url)
                # Spin up a feeder thread that loops the video file forever.
                from .core.mp4_feeder import start_mp4_feeder
                t = threading.Thread(
                    target=start_mp4_feeder,
                    args=(cam_id, stream_url, manager),
                    name=f"mp4-feeder-{cam_id}",
                    daemon=True,
                )
                t.start()
            except Exception as exc:
                logger.warning("Failed to register MP4 camera %d: %s", cam_id, exc)



def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title="AERIS AI Detection Service",
        version="2.0.0",
        description=(
            "Producer-consumer AI pipeline: FrameReader threads feed frames to "
            "DetectionWorker threads; API endpoints return cached results only."
        ),
    )

    # CORS — restrict to the backend proxy in production;
    # the frontend never calls this service directly.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],   # nginx sits in front; direct browser access is blocked there
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount routers
    application.include_router(health_router)
    application.include_router(camera_router)
    application.include_router(frame_router)
    application.include_router(detect_router)

    frontend_dir = _frontend_dist_dir()

    # Mirrored router set under /ai — the same-origin entry point the frontend
    # actually uses. The desktop bundle loads the SPA + AI from this one origin
    # (the /ai proxy stripped by nginx/Vite/Django in other deployments).
    ai_app = FastAPI(title="AERIS AI Detection Service (bundled /ai)")
    ai_app.add_middleware(ForceApiKeyMiddleware, api_key=AI_SERVICE_API_KEY)
    ai_app.include_router(health_router)
    ai_app.include_router(camera_router)
    ai_app.include_router(frame_router)
    ai_app.include_router(detect_router)
    application.mount("/ai", ai_app)

    # SPA serving (bundled desktop product). Registered LAST so it never
    # shadows the API routers above: unknown paths serve built assets, else the
    # index.html fallback so React Router can handle deep links.
    @application.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        base = frontend_dir.resolve()
        if not base.is_dir():
            raise HTTPException(
                status_code=404,
                detail="Frontend not built — run `npm run build` in frontend/ first",
            )
        if full_path:
            candidate = (base / full_path).resolve()
            if candidate.is_relative_to(base) and candidate.is_file():
                return FileResponse(candidate)
        index = base / "index.html"
        if index.is_file():
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="Frontend index.html missing")

    # Lifecycle events
    @application.on_event("startup")
    def on_startup():
        logger.info("AI service starting up — initialising singletons")
        # Importing the singletons here triggers their __init__ (model loading etc.)
        from .core.camera_manager import CameraManager
        from .core.model_registry import ModelRegistry
        from .core import config_store
        _cm = CameraManager()
        _mr = ModelRegistry()

        # Re-apply persisted thresholds so settings survive restarts
        saved = config_store.load_saved()
        if saved.get("confidence_threshold") is not None:
            try:
                conf = float(saved["confidence_threshold"])
                _mr.set_conf_threshold(conf)
                if getattr(_cm, "detector", None) is not None:
                    _cm.detector.confidence_threshold = conf
            except (TypeError, ValueError):
                logger.warning(
                    "Ignoring invalid persisted confidence_threshold: %r",
                    saved["confidence_threshold"],
                )
        for inc_type, threshold in (saved.get("type_thresholds") or {}).items():
            try:
                _cm.confidence_filter.set_type_threshold(inc_type, float(threshold))
            except (TypeError, ValueError):
                logger.warning("Ignoring invalid persisted threshold for %s: %r", inc_type, threshold)

        # Auto-register all active cameras from Django so RTSP streams and
        # MP4 test files start detecting immediately — without waiting for a
        # user to open the camera monitoring page.
        import threading
        threading.Thread(target=_auto_register_cameras, daemon=True).start()

        logger.info("AI service ready")

    @application.on_event("shutdown")
    def on_shutdown():
        logger.info("AI service shutting down — stopping all camera threads")
        from .core.camera_manager import CameraManager
        CameraManager().shutdown()
        logger.info("AI service shutdown complete")

    return application


app = create_app()


if __name__ == "__main__":
    import uvicorn
    host = config("AI_SERVICE_HOST", default="0.0.0.0")
    port = int(config("AI_SERVICE_PORT", default="8005"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
