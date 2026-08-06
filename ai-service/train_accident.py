"""
Train a YOLOv11-nano accident detection model from the Roboflow dataset.
Uses the existing yolo11n.pt as pretrained backbone.
"""
from ultralytics import YOLO
import os

DATA_YAML = os.path.join(os.path.dirname(__file__), "data", "accident", "data.yaml")
BASE_MODEL = "yolo11n.pt"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "models")

def train():
    model = YOLO(BASE_MODEL)
    results = model.train(
        data=DATA_YAML,
        epochs=50,
        imgsz=640,
        batch=16,
        name="accident_detector",
        project=OUTPUT_DIR,
        exist_ok=True,
        patience=10,
        device="cpu",
    )
    best = os.path.join(OUTPUT_DIR, "accident_detector", "weights", "best.pt")
    final = os.path.join(OUTPUT_DIR, "accident_detector", "weights", "last.pt")
    print(f"\nBest model: {best}")
    print(f"Last model: {final}")
    return best

if __name__ == "__main__":
    train()
