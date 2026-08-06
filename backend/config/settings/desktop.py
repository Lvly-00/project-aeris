"""
Desktop settings — Electron app, SQLite, local media, Django serves the SPA.
DEBUG=True is acceptable here since the process runs locally on the user's machine.
"""
from .base import *  # noqa: F401, F403
from decouple import config
import os

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "*"]

DESKTOP_MODE = True

# ── Database — SQLite at a configurable path ──────────────────────────────────
_db_dir = config("DESKTOP_DB_DIR", default=str(BASE_DIR))  # noqa: F405
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(_db_dir, "db.sqlite3"),
    }
}

# ── Media — configurable local path ──────────────────────────────────────────
MEDIA_ROOT = config("DESKTOP_MEDIA_DIR", default=str(BASE_DIR / "media"))  # noqa: F405
os.makedirs(MEDIA_ROOT, exist_ok=True)

# ── Frontend — Django serves the built React SPA ─────────────────────────────
_frontend_dir = config(
    "DESKTOP_FRONTEND_DIR",
    default=str(BASE_DIR.parent / "frontend" / "dist"),  # noqa: F405
)
FRONTEND_DIST_DIR = _frontend_dir
_assets_dir = os.path.join(_frontend_dir, "assets")
STATICFILES_DIRS = [_assets_dir] if os.path.exists(_assets_dir) else []

# ── CORS — allow all for local Electron IPC ───────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ── Throttling — disable for desktop ─────────────────────────────────────────
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
