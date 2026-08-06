"""
Detection, configuration, incident, and recommendation routes.
All endpoints require X-API-Key authentication.
"""
import time
import cv2
import numpy as np
from typing import List
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form

from ..core.security import require_api_key
from ..core.camera_manager import CameraManager
from ..core.model_registry import ModelRegistry
from ..core.incident_generator import IncidentGenerator
from ..core.recommendation_engine import RecommendationEngine
from ..models.yolo_detector import Detection
from ..schemas.requests import (
    DetectionResponse,
    IncidentCreateRequest,
    IncidentCreateResponse,
    ConfigUpdateRequest,
    ConfigResponse,
)
from ..config import FRAME_SKIP, DETECTION_FPS

router = APIRouter(tags=["detection"])

_manager = CameraManager()
_model_registry = ModelRegistry()
_incident_generator = IncidentGenerator()
_recommendation_engine = RecommendationEngine()


# ── Detection ─────────────────────────────────────────────────────────────────

def _detection_list_from_cache(camera_id: int) -> List[dict]:
    cached = _manager.get_detection(camera_id)
    if cached is None:
        return []
    return [
        {
            "camera_id": d.camera_id,
            "incident_type": d.incident_type,
            "confidence": d.confidence,
            "bbox": d.bbox,
            "timestamp": d.timestamp,
            "crowd_size": getattr(d, "crowd_size", None),
        }
        for d in cached.detections
    ]


@router.get("/cameras/{camera_id}/detect")
def detect_on_camera(camera_id: int, _: str = Depends(require_api_key)):
    """Return the latest cached detection for a camera (zero inference time)."""
    _manager.try_auto_register(camera_id)
    if _manager.detector is None:
        raise HTTPException(status_code=503, detail="Detection model not loaded")
    return _detection_list_from_cache(camera_id)


@router.post("/detect/frame")
async def detect_frame(
    file: UploadFile = File(...),
    camera_id: int = Form(...),
    _: str = Depends(require_api_key),
):
    """
    Upload a frame for detection (HTTP/MP4 cameras).

    The frame is pushed into the camera's detection worker buffer.
    Returns the latest cached detection — no YOLO runs in the request handler.
    """
    if camera_id <= 0:
        raise HTTPException(status_code=400, detail="Valid camera_id (> 0) is required")
    if _manager.detector is None:
        raise HTTPException(status_code=503, detail="Detection model not loaded")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    _manager.try_auto_register(camera_id)
    _manager.upload_frame(camera_id, frame)

    upload_time = time.time()
    cached = _manager.cache.wait_for_update(camera_id, after_timestamp=upload_time, timeout=1.0)
    if cached is None:
        cached = _manager.get_detection(camera_id)
    if cached is None:
        return []

    return [
        DetectionResponse(
            camera_id=d.camera_id,
            incident_type=d.incident_type,
            confidence=d.confidence,
            bbox=d.bbox,
            timestamp=d.timestamp,
            crowd_size=getattr(d, "crowd_size", None),
        )
        for d in cached.detections
    ]


# ── Incidents & Recommendations ───────────────────────────────────────────────

@router.post("/incidents/create", response_model=IncidentCreateResponse)
def create_incident(request: IncidentCreateRequest, _: str = Depends(require_api_key)):
    """Create an incident from detection data via the backend API."""
    try:
        detection = Detection(
            camera_id=0,
            incident_type=request.incident_type,
            confidence=request.confidence_score,
            bbox=[0, 0, 100, 100],
            timestamp=time.time(),
        )
        incident_id = _incident_generator.create_incident(detection)
        if incident_id:
            return IncidentCreateResponse(
                incident_id=incident_id, detection_id=None,
                success=True, message="Incident created successfully",
            )
        return IncidentCreateResponse(
            incident_id=None, detection_id=None,
            success=False, message="Failed to create incident",
        )
    except Exception as exc:
        return IncidentCreateResponse(
            incident_id=None, detection_id=None,
            success=False, message=str(exc),
        )


@router.post("/recommendations/generate")
def generate_recommendations(request: IncidentCreateRequest, _: str = Depends(require_api_key)):
    """Generate response recommendations for an incident."""
    incident_data = {
        "id": request.incident_id,
        "incident_type": request.incident_type,
        "severity": request.severity,
        "confidence_score": request.confidence_score,
        "duration": request.duration,
        "crowd_size": request.crowd_size,
        "location_lat": request.location_lat,
        "location_lng": request.location_lng,
    }
    recs = _recommendation_engine.generate_recommendations(incident_data)
    return {"incident_id": request.incident_id, "recommendations": recs, "count": len(recs)}


# ── Configuration ─────────────────────────────────────────────────────────────

@router.get("/config", response_model=ConfigResponse)
def get_config(_: str = Depends(require_api_key)):
    """Get current AI service configuration."""
    cf = _manager.confidence_filter
    return ConfigResponse(
        confidence_threshold=_model_registry.get_conf_threshold(),
        iou_threshold=_model_registry.get_iou_threshold(),
        frame_skip=FRAME_SKIP,
        detection_fps=DETECTION_FPS,
        type_thresholds={
            t: cf.get_type_threshold(t)
            for t in ["Fire", "Smoke", "Vehicle_Accident"]
        },
    )


@router.post("/config")
def update_config(request: ConfigUpdateRequest, _: str = Depends(require_api_key)):
    """Update AI service configuration at runtime."""
    if request.confidence_threshold is not None:
        _model_registry.set_conf_threshold(request.confidence_threshold)
        if _manager.detector:
            _manager.detector.confidence_threshold = request.confidence_threshold
    if request.iou_threshold is not None:
        _model_registry.set_iou_threshold(request.iou_threshold)
    if request.type_thresholds:
        for inc_type, threshold in request.type_thresholds.items():
            _manager.confidence_filter.set_type_threshold(inc_type, threshold)
    return {"status": "updated"}
