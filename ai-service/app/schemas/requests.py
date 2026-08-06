"""
Request and response schemas — explicit Pydantic models for every endpoint
that accepts a body or returns a structured payload (brief §3, §5.6).

Keeping schemas in a single file until they grow large enough to warrant
splitting per-resource (same rule as the backend serializers).
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Camera management ─────────────────────────────────────────────────────────

class CameraRegisterRequest(BaseModel):
    camera_id: int = Field(..., gt=0, description="Positive integer camera ID")
    source: str = Field(..., min_length=1, description="RTSP URL or file path")
    stream_type: str = Field("RTSP", description="One of: RTSP, HTTP, MP4")

    @field_validator("stream_type")
    @classmethod
    def validate_stream_type(cls, v: str) -> str:
        allowed = {"RTSP", "HTTP", "MP4"}
        if v.upper() not in allowed:
            raise ValueError(f"stream_type must be one of {allowed}")
        return v.upper()


class CameraStatusResponse(BaseModel):
    camera_id: int
    source: str
    stream_type: str
    status: str
    connected: bool
    detecting: bool
    fps: float
    resolution: str
    frame_count: int
    last_frame_time: Optional[float]
    detection_count: int
    avg_inference_time_ms: float
    last_detection_time: Optional[float]
    registered_at: float


# ── Detection ─────────────────────────────────────────────────────────────────

class DetectionResponse(BaseModel):
    camera_id: int
    incident_type: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: List[float] = Field(..., min_length=4, max_length=4)
    timestamp: float
    crowd_size: Optional[int] = None


# ── Incident / Recommendations ────────────────────────────────────────────────

class IncidentCreateRequest(BaseModel):
    incident_id: int
    incident_type: str
    severity: str = "Medium"
    confidence_score: float = Field(0.5, ge=0.0, le=1.0)
    duration: Optional[float] = None
    crowd_size: Optional[int] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class IncidentCreateResponse(BaseModel):
    incident_id: Optional[int]
    detection_id: Optional[int]
    success: bool
    message: str


class RecommendationResponse(BaseModel):
    incident_id: int
    recommendations: List[dict]
    count: int


# ── Configuration ─────────────────────────────────────────────────────────────

class ConfigUpdateRequest(BaseModel):
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    iou_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    frame_skip: Optional[int] = Field(None, ge=0)
    detection_fps: Optional[float] = Field(None, gt=0.0)
    type_thresholds: Optional[Dict[str, float]] = None

    @field_validator("type_thresholds")
    @classmethod
    def validate_thresholds(cls, v: Optional[Dict[str, float]]) -> Optional[Dict[str, float]]:
        if v is None:
            return v
        for key, val in v.items():
            if not 0.0 <= val <= 1.0:
                raise ValueError(f"Threshold for '{key}' must be between 0.0 and 1.0")
        return v


class ConfigResponse(BaseModel):
    confidence_threshold: float
    iou_threshold: float
    frame_skip: int
    detection_fps: float
    type_thresholds: Dict[str, float]
