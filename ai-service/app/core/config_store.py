"""
Config Store — persists AI detection thresholds to a JSON file so runtime
configuration survives a service restart.

The in-memory singletons (ModelRegistry, ConfidenceFilter) hold the live
values; this module writes them to disk whenever they change and re-applies
them on startup.
"""
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

CONFIG_FILE = Path(
    os.getenv("AI_CONFIG_FILE", str(Path(__file__).resolve().parents[2] / "ai_config.json"))
)

INCIDENT_TYPES = ["Fire", "Smoke", "Vehicle_Accident"]


def load_saved() -> dict:
    """Return the persisted config dict, or {} when absent/corrupt."""
    if not CONFIG_FILE.exists():
        return {}
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        logger.warning("Could not read config file %s — using defaults", CONFIG_FILE)
        return {}


def save(confidence_threshold: float, type_thresholds: dict) -> None:
    """Persist the current thresholds so they survive a service restart."""
    payload = {
        "confidence_threshold": float(confidence_threshold),
        "type_thresholds": {str(k): float(v) for k, v in type_thresholds.items()},
    }
    try:
        CONFIG_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        logger.info("Persisted AI config to %s", CONFIG_FILE)
    except OSError:
        logger.warning("Could not write config file %s", CONFIG_FILE)