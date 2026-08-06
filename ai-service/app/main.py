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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from decouple import config

from .api.health_routes import router as health_router
from .api.camera_routes import router as camera_router
from .api.frame_routes import router as frame_router
from .api.detect_routes import router as detect_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

    # Lifecycle events
    @application.on_event("startup")
    def on_startup():
        logger.info("AI service starting up — initialising singletons")
        # Importing the singletons here triggers their __init__ (model loading etc.)
        from .core.camera_manager import CameraManager
        from .core.model_registry import ModelRegistry
        CameraManager()
        ModelRegistry()
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
