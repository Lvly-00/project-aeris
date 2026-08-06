"""
AI Detection Accuracy Tester for Aeris CCTV
============================================
Measures precision, recall, F1-score, and false positive rate
for each incident type detected by the AI service.

Usage:
    python scripts/test_accuracy.py                  # test via AI service HTTP API
    python scripts/test_accuracy.py --local           # test YOLO models directly (no server needed)
    python scripts/test_accuracy.py --type accident   # test only one type

Folder structure (for --local mode or manual testing):
    test_data/
    ├── fire/          # Images containing fire/smoke
    ├── smoke/         # Images containing smoke
    ├── accident/      # Images containing vehicle accidents
    └── normal/        # Images with NO incidents (negative samples)

Each image file in a folder is ground-truth labeled by its parent folder name.
"""

import os
import sys
import json
import time
import argparse
import requests
import cv2
import numpy as np
from pathlib import Path
from collections import defaultdict
from datetime import datetime

AI_URL = "http://localhost:8005"
API_KEY = "ai-service-key"
TEST_DATA_DIR = Path(__file__).parent.parent / "test_data"
CONFIDENCE_THRESHOLD = 0.3

# Map folder names to expected incident types the AI should return
LABEL_MAP = {
    "fire": ["Fire"],
    "smoke": ["Smoke"],
    "accident": ["Vehicle_Accident"],
    "normal": [],
}

# Auto-discover test images from training datasets if test_data/ is empty
AUTO_DISCOVER_SOURCES = {
    "accident": [
        Path(__file__).parent.parent / "ai-service" / "data" / "accident" / "test" / "images",
        Path(__file__).parent.parent / "ai-service" / "data" / "accident" / "valid" / "images",
    ],
}


def discover_test_images(filter_type=None):
    """Find test images from test_data/ or auto-discover from training datasets."""
    cases = []

    # 1. Check test_data/ directory first
    if TEST_DATA_DIR.exists():
        for label_dir in sorted(TEST_DATA_DIR.iterdir()):
            if not label_dir.is_dir():
                continue
            label = label_dir.name.lower()
            if label not in LABEL_MAP:
                continue
            if filter_type and label != filter_type:
                continue
            for img_file in sorted(label_dir.iterdir()):
                if img_file.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
                    cases.append({
                        "path": str(img_file),
                        "label": label,
                        "expected_types": LABEL_MAP[label],
                    })

    # 2. Auto-discover from training datasets
    for label, sources in AUTO_DISCOVER_SOURCES.items():
        if filter_type and label != filter_type:
            continue
        if any(c["label"] == label for c in cases):
            continue  # already have manual test data for this label
        for src_dir in sources:
            if src_dir.exists():
                for img_file in sorted(src_dir.iterdir()):
                    if img_file.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
                        cases.append({
                            "path": str(img_file),
                            "label": label,
                            "expected_types": LABEL_MAP[label],
                        })
                break  # only use first available source

    return cases


def run_detection_http(image_path: str, camera_id: int = 999) -> list:
    """Send an image to /detect/frame and return detection results."""
    with open(image_path, "rb") as f:
        resp = requests.post(
            f"{AI_URL}/detect/frame",
            files={"file": (os.path.basename(image_path), f, "image/jpeg")},
            data={"camera_id": str(camera_id)},
            headers={"X-API-Key": API_KEY},
            timeout=30,
        )
    if resp.status_code != 200:
        print(f"  ERROR {resp.status_code}: {resp.text[:200]}")
        return []
    return resp.json()


def run_detection_local(image_path: str, models: dict) -> list:
    """Run detection locally using YOLO models directly (no server needed)."""
    import cv2
    frame = cv2.imread(str(image_path))
    if frame is None:
        return []

    from ultralytics import YOLO
    detections = []
    timestamp = time.time()

    for model_name, model in models.items():
        results = model(frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
        if not results or results[0].boxes is None:
            continue
        boxes = results[0].boxes
        for i in range(len(boxes)):
            conf = float(boxes.conf[i])
            if conf < CONFIDENCE_THRESHOLD:
                continue
            xyxy = boxes.xyxy[i].tolist()
            cls_id = int(boxes.cls[i])
            class_name = model.names.get(cls_id, str(cls_id))
            # Map to our incident types
            incident_type = None
            if model_name == "main":
                if class_name == "fire" or class_name == "smoke":
                    incident_type = class_name.capitalize()
            elif model_name == "accident":
                incident_type = "Vehicle_Accident"

            if incident_type:
                detections.append({
                    "incident_type": incident_type,
                    "confidence": conf,
                    "bbox": xyxy,
                    "timestamp": timestamp,
                })

    return detections


def load_local_models():
    """Load YOLO models for local testing."""
    from ultralytics import YOLO
    ai_dir = Path(__file__).parent.parent / "ai-service"
    models = {}

    main_path = os.environ.get("YOLO_MODEL_PATH", str(ai_dir / "yolo11n.pt"))
    if os.path.exists(main_path):
        models["main"] = YOLO(main_path)

    accident_path = str(ai_dir / "models" / "accident_detector" / "weights" / "best.pt")
    if os.path.exists(accident_path):
        models["accident"] = YOLO(accident_path)

    return models


def match_detection(detected_types: list, expected_types: list) -> dict:
    """Check if expected incident type appears in detected types."""
    detected_set = set(t.lower() for t in detected_types)
    expected_set = set(t.lower() for t in expected_types)

    matched = detected_set & expected_set
    false_positives = detected_set - expected_set
    missed = expected_set - detected_set

    return {
        "matched": list(matched),
        "false_positives": list(false_positives),
        "missed": list(missed),
        "correct": len(matched) > 0 if expected_types else len(detected_set) == 0,
    }


def run_test_suite(filter_type=None, use_local=False):
    """Run the full accuracy test suite."""
    all_cases = discover_test_images(filter_type)

    if not all_cases:
        print("No test images found!")
        print()
        print("Options:")
        print("  1. Create test_data/ directory with labeled subfolders:")
        print("     test_data/fire/      # fire/smoke images")
        print("     test_data/smoke/     # smoke images")
        print("     test_data/accident/  # accident images")
        print("     test_data/normal/    # normal scene images")
        print()
        print("  2. The script auto-discovers accident test images from:")
        print("     ai-service/data/accident/test/images/")
        print("     ai-service/data/accident/valid/images/")
        sys.exit(1)

    # Setup detection method
    local_models = None
    if use_local:
        local_models = load_local_models()
        if not local_models:
            print("ERROR: No YOLO models found for local testing")
            sys.exit(1)
        print(f"Local mode — loaded {len(local_models)} models: {list(local_models.keys())}")
    else:
        try:
            resp = requests.get(f"{AI_URL}/health", timeout=5)
            if resp.status_code != 200:
                print(f"AI service not healthy: {resp.status_code}")
                sys.exit(1)
        except requests.ConnectionError:
            print(f"Cannot connect to AI service at {AI_URL}")
            print("Use --local flag to test models directly without the server")
            sys.exit(1)

    categories = sorted(set(c["label"] for c in all_cases))
    print(f"Found {len(all_cases)} test images across {len(categories)} categories: {', '.join(categories)}")
    print(f"Mode: {'local' if use_local else 'HTTP'}")
    print(f"Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print("-" * 60)

    # Run detection on each image
    results_by_label = defaultdict(lambda: {
        "total": 0, "correct": 0, "incorrect": 0,
        "true_positives": 0, "false_positives": 0, "false_negatives": 0,
        "true_negatives": 0,
        "details": [],
    })

    for i, case in enumerate(all_cases):
        label = case["label"]
        expected = case["expected_types"]
        filename = os.path.basename(case["path"])

        print(f"[{i+1}/{len(all_cases)}] {label}/{filename}...", end=" ", flush=True)

        start = time.time()
        if use_local:
            detections = run_detection_local(case["path"], local_models)
        else:
            detections = run_detection_http(case["path"])
        elapsed = time.time() - start

        detected_types = [d["incident_type"] for d in detections if d["confidence"] >= CONFIDENCE_THRESHOLD]
        detected_high_conf = [d for d in detections if d["confidence"] >= CONFIDENCE_THRESHOLD]

        match = match_detection(detected_types, expected)

        stats = results_by_label[label]
        stats["total"] += 1
        stats["details"].append({
            "file": filename,
            "expected": expected,
            "detected": detected_high_conf,
            "match": match,
            "time_ms": round(elapsed * 1000),
        })

        if label == "normal":
            if len(detected_types) == 0:
                stats["correct"] += 1
                stats["true_negatives"] += 1
                print(f"OK (no detections) [{elapsed*1000:.0f}ms]")
            else:
                stats["incorrect"] += 1
                stats["false_positives"] += 1
                print(f"FALSE POSITIVE: {detected_types} [{elapsed*1000:.0f}ms]")
        else:
            if match["correct"]:
                stats["correct"] += 1
                stats["true_positives"] += 1
                print(f"TP ({detected_types}) [{elapsed*1000:.0f}ms]")
            else:
                stats["incorrect"] += 1
                if detected_types:
                    stats["false_positives"] += 1
                    stats["false_negatives"] += 1
                    print(f"MISMATCH: expected={expected} got={detected_types} [{elapsed*1000:.0f}ms]")
                else:
                    stats["false_negatives"] += 1
                    print(f"MISS: expected={expected} got=none [{elapsed*1000:.0f}ms]")

    # Calculate and display metrics
    print("\n" + "=" * 70)
    print("ACCURACY REPORT")
    print("=" * 70)

    all_tp = all_fp = all_fn = all_tn = 0
    macro_f1_scores = []

    for label in sorted(results_by_label.keys()):
        s = results_by_label[label]
        tp = s["true_positives"]
        fp = s["false_positives"]
        fn = s["false_negatives"]
        tn = s["true_negatives"]
        total = s["total"]

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        accuracy = s["correct"] / total if total > 0 else 0

        all_tp += tp; all_fp += fp; all_fn += fn; all_tn += tn
        if label != "normal":
            macro_f1_scores.append(f1)

        print(f"\n  {label.upper()} ({total} images)")
        print(f"    Precision:  {precision:.1%}  ({tp}/{tp+fp})")
        print(f"    Recall:     {recall:.1%}  ({tp}/{tp+fn})")
        print(f"    F1 Score:   {f1:.1%}")
        print(f"    Accuracy:   {accuracy:.1%}  ({s['correct']}/{total})")
        if label == "normal":
            print(f"    False Pos:  {fp}")

    # Overall metrics
    overall_precision = all_tp / (all_tp + all_fp) if (all_tp + all_fp) > 0 else 0
    overall_recall = all_tp / (all_tp + all_fn) if (all_tp + all_fn) > 0 else 0
    overall_f1 = 2 * overall_precision * overall_recall / (overall_precision + overall_recall) if (overall_precision + overall_recall) > 0 else 0
    macro_f1 = sum(macro_f1_scores) / len(macro_f1_scores) if macro_f1_scores else 0
    total_images = sum(s["total"] for s in results_by_label.values())
    total_correct = sum(s["correct"] for s in results_by_label.values())
    overall_accuracy = total_correct / total_images if total_images > 0 else 0

    print(f"\n{'=' * 70}")
    print(f"  OVERALL RESULTS")
    print(f"  {'=' * 66}")
    print(f"  Total images:      {total_images}")
    print(f"  Overall Accuracy:  {overall_accuracy:.1%} ({total_correct}/{total_images})")
    print(f"  Macro Precision:   {overall_precision:.1%}")
    print(f"  Macro Recall:      {overall_recall:.1%}")
    print(f"  Macro F1 Score:    {macro_f1:.1%}")
    print(f"  Micro F1 Score:    {overall_f1:.1%}")
    print(f"  True Positives:    {all_tp}")
    print(f"  False Positives:   {all_fp}")
    print(f"  False Negatives:   {all_fn}")
    print(f"  True Negatives:    {all_tn}")
    print()

    # Save detailed report
    report = {
        "timestamp": datetime.now().isoformat(),
        "config": {
            "ai_url": AI_URL,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "total_images": total_images,
        },
        "overall": {
            "accuracy": round(overall_accuracy, 4),
            "precision": round(overall_precision, 4),
            "recall": round(overall_recall, 4),
            "f1_macro": round(macro_f1, 4),
            "f1_micro": round(overall_f1, 4),
            "true_positives": all_tp,
            "false_positives": all_fp,
            "false_negatives": all_fn,
            "true_negatives": all_tn,
        },
        "per_label": {},
    }
    for label, s in results_by_label.items():
        tp = s["true_positives"]; fp = s["false_positives"]; fn = s["false_negatives"]
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
        report["per_label"][label] = {
            "total": s["total"],
            "correct": s["correct"],
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "details": s["details"],
        }

    report_path = Path(__file__).parent.parent / "test_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"  Detailed report saved: {report_path}")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test AI detection accuracy")
    parser.add_argument("--local", action="store_true", help="Test models directly without AI server")
    parser.add_argument("--type", choices=["fire", "smoke", "accident", "normal"], help="Test only one incident type")
    args = parser.parse_args()
    run_test_suite(filter_type=args.type, use_local=args.local)
