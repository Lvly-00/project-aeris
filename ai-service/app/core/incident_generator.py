"""
Incident Generator - Converts high-confidence detections into incidents
Sends incident data to the backend API
"""
import logging
import requests
import json
import cv2
import numpy as np
import base64
import os
from typing import Optional
from datetime import datetime
from decouple import config
from ..models.yolo_detector import Detection

logger = logging.getLogger(__name__)

class IncidentGenerator:
    def __init__(self):
        self.api_base_url = config('BACKEND_API_URL', default='http://backend:8000/api')
        self.api_key = config('AI_SERVICE_API_KEY', default='ai-service-key')
        self.timeout = int(config('API_TIMEOUT', default='10'))
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        })
    
    def detection_to_incident(self, detection: Detection, camera_info: Optional[dict] = None) -> Optional[dict]:
        """Convert a detection to an incident payload"""
        if detection.frame is None:
            return None
        
        # Encode frame as JPEG base64
        _, buffer = cv2.imencode('.jpg', detection.frame)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        payload = {
            'camera_id': detection.camera_id,
            'incident_type': detection.incident_type,
            'confidence_score': detection.confidence,
            'bbox_coords': json.dumps(detection.bbox),
            'detected_at': datetime.fromtimestamp(detection.timestamp).isoformat(),
            'evidence_image': image_base64,
            'description': f"AI detected {detection.incident_type} with {detection.confidence:.1%} confidence from camera {detection.camera_id}",
        }
        
        if camera_info:
            payload['location_lat'] = camera_info.get('latitude')
            payload['location_lng'] = camera_info.get('longitude')
            payload['zone_id'] = camera_info.get('zone')
        
        return payload
    
    def create_incident(self, detection: Detection, camera_info: Optional[dict] = None) -> Optional[int]:
        """Send incident to backend API"""
        try:
            payload = self.detection_to_incident(detection, camera_info)
            if payload is None:
                return None
            
            # Send evidence image as file upload
            _, buffer = cv2.imencode('.jpg', detection.frame)
            files = {'evidence_image': ('detection.jpg', buffer.tobytes(), 'image/jpeg')}
            
            data = {k: v for k, v in payload.items() if k != 'evidence_image'}
            data['bbox_coords'] = json.dumps(detection.bbox)
            
            # Also create a detection record
            detection_payload = {
                'camera_id': detection.camera_id,
                'incident_type': detection.incident_type,
                'confidence_score': detection.confidence,
                'bbox_coords': json.dumps(detection.bbox),
                'fps': 0,
                'frame_timestamp': datetime.fromtimestamp(detection.timestamp).isoformat(),
            }
            
            response = self.session.post(
                f'{self.api_base_url}/detections/',
                data={**detection_payload, **data},
                files=files,
                timeout=self.timeout
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                incident_id = result.get('id')
                logger.info(f"Created incident {incident_id} for {detection.incident_type} from camera {detection.camera_id}")
                return incident_id
            else:
                logger.error(f"Failed to create incident: {response.status_code} {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating incident: {e}")
            return None
    
    def create_detection_only(self, detection: Detection) -> Optional[int]:
        """Create a detection record without creating an incident"""
        try:
            _, buffer = cv2.imencode('.jpg', detection.frame)
            files = {'snapshot_image': ('detection.jpg', buffer.tobytes(), 'image/jpeg')}
            
            data = {
                'camera_id': detection.camera_id,
                'incident_type': detection.incident_type,
                'confidence_score': detection.confidence,
                'bbox_coords': json.dumps(detection.bbox),
                'frame_timestamp': datetime.fromtimestamp(detection.timestamp).isoformat(),
            }
            
            response = self.session.post(
                f'{self.api_base_url}/detections/',
                data=data,
                files=files,
                timeout=self.timeout
            )
            
            if response.status_code in [200, 201]:
                return response.json().get('id')
            return None
        except Exception as e:
            logger.error(f"Error creating detection: {e}")
            return None
