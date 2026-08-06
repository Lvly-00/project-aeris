"""
Centralized Configuration - All environment variables in one place.
Uses python-decouple for environment variable management.
"""
import os
from decouple import config

# AI Service
AI_SERVICE_HOST: str = config('AI_SERVICE_HOST', default='0.0.0.0')
AI_SERVICE_PORT: int = int(config('AI_SERVICE_PORT', default='8005'))
AI_SERVICE_API_KEY: str = config('AI_SERVICE_API_KEY', default='ai-service-key')

# Model
YOLO_MODEL_PATH: str = config('YOLO_MODEL_PATH', default='yolo11n.pt')
ACCIDENT_MODEL_PATH: str = config('ACCIDENT_MODEL_PATH', default='models/accident_detector/weights/best.pt')
DEVICE: str = config('DEVICE', default='cpu')
DEFAULT_CONF_THRESHOLD: float = float(config('DEFAULT_CONF_THRESHOLD', default='0.3'))
IOU_THRESHOLD: float = float(config('IOU_THRESHOLD', default='0.5'))

# Detection Pipeline
FRAME_SKIP: int = int(config('FRAME_SKIP', default='2'))
DETECTION_FPS: float = float(config('DETECTION_FPS', default='10.0'))
FRAME_WIDTH: int = int(config('FRAME_WIDTH', default='640'))
FRAME_HEIGHT: int = int(config('FRAME_HEIGHT', default='640'))

# Backend Integration
BACKEND_API_URL: str = config('BACKEND_API_URL', default='http://localhost:8000/api')
API_TIMEOUT: int = int(config('API_TIMEOUT', default='10'))
# Shared secret for /internal/ endpoints on the Django backend
INTERNAL_API_KEY: str = config('INTERNAL_API_KEY', default='')

# Reconnection
RECONNECT_BASE_DELAY: float = float(config('RECONNECT_BASE_DELAY', default='1.0'))
RECONNECT_MAX_DELAY: float = float(config('RECONNECT_MAX_DELAY', default='30.0'))

# Resolve model path to absolute
_model_path = YOLO_MODEL_PATH
if not os.path.isabs(_model_path):
    _model_path = os.path.join(os.getcwd(), _model_path)
YOLO_MODEL_PATH_ABS: str = _model_path
