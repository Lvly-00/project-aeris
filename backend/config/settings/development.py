"""
Development settings — local machine only.
DEBUG=True, SQLite, permissive CORS to localhost ports, console email.
Never use these settings in production or Docker deployments.
"""
from .base import *  # noqa: F401, F403
from decouple import config, Csv

DEBUG = True

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1,0.0.0.0",
    cast=Csv(),
)

# ── Database — SQLite by default for local dev ────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405 — BASE_DIR from base.*
    }
}

# ── CORS — localhost frontend ports only, never wildcard ─────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default=(
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    ),
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOW_ALL_ORIGINS is intentionally absent — never allow wildcard

# ── Email — Brevo Transactional Email API v3 (free-tier compatible) ──────────
# SMTP relay (smtp-relay.brevo.com) requires a paid plan.
# The REST API works on free accounts.
BREVO_API_KEY = config("BREVO_API_KEY", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="Aeris <lovelypintes@gmail.com>")

# ── Media — serve locally via Django ─────────────────────────────────────────
# Handled automatically by DEBUG=True + static() in urls.py

# ── Throttling — relax for local dev ─────────────────────────────────────────
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405
