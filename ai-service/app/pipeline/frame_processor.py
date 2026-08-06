"""
Frame Processor - Preprocesses frames before AI detection
Handles resizing, normalization, and enhancement
"""
import cv2
import numpy as np
from typing import Optional, Tuple

class FrameProcessor:
    def __init__(self, target_size: Tuple[int, int] = (640, 640)):
        self.target_size = target_size
        self._last_preprocess = None  # (scale, left, top, orig_w, orig_h)

    def preprocess(self, frame: np.ndarray) -> np.ndarray:
        """Preprocess frame for YOLO inference"""
        if frame is None:
            return None
        h, w = frame.shape[:2]
        scale = min(self.target_size[0] / w, self.target_size[1] / h)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(frame, (new_w, new_h))
        dw = self.target_size[0] - new_w
        dh = self.target_size[1] - new_h
        top, bottom = dh // 2, dh - dh // 2
        left, right = dw // 2, dw - dw // 2
        padded = cv2.copyMakeBorder(resized, top, bottom, left, right,
                                     cv2.BORDER_CONSTANT, value=(114, 114, 114))
        self._last_preprocess = (scale, left, top, w, h)
        return padded

    def remap_bbox(self, bbox):
        """Convert bbox [x1,y1,x2,y2] from padded 640x640 coords back to original frame coords"""
        if self._last_preprocess is None:
            return bbox
        scale, left, top, orig_w, orig_h = self._last_preprocess
        x1 = max(0, min(orig_w, int((bbox[0] - left) / scale)))
        y1 = max(0, min(orig_h, int((bbox[1] - top) / scale)))
        x2 = max(0, min(orig_w, int((bbox[2] - left) / scale)))
        y2 = max(0, min(orig_h, int((bbox[3] - top) / scale)))
        return [x1, y1, x2, y2]
    
    def enhance_frame(self, frame: np.ndarray) -> np.ndarray:
        """Enhance frame for better detection in low light"""
        if frame is None:
            return None
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        return enhanced
    
    def draw_detection(self, frame: np.ndarray, bbox: Tuple[int, int, int, int], 
                       label: str, confidence: float, color: Tuple[int, int, int] = (0, 255, 0)) -> np.ndarray:
        """Draw bounding box and label on frame"""
        x1, y1, x2, y2 = bbox
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label_text = f"{label} {confidence:.2f}"
        (text_w, text_h), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(frame, (x1, y1 - text_h - 5), (x1 + text_w, y1), color, -1)
        cv2.putText(frame, label_text, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        return frame
    
    def add_overlay(self, frame: np.ndarray, fps: float, camera_name: str) -> np.ndarray:
        """Add overlay information to frame"""
        h, w = frame.shape[:2]
        # Top bar
        cv2.rectangle(frame, (0, 0), (w, 30), (0, 0, 0), -1)
        cv2.putText(frame, f"Camera: {camera_name}", (10, 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"FPS: {fps:.1f}", (w - 100, 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        # Timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, timestamp, (w // 2 - 80, 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        return frame
