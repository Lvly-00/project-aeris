"""
Development settings — local machine only.
DEBUG=True, SQLite (or local PostgreSQL via DATABASE_URL), permissive CORS to
localhost ports, console email.
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

# ── Database — PostgreSQL if DATABASE_URL is set, else SQLite ─────────────────
# To use a local PostgreSQL (e.g. created in pgAdmin), install the driver:
#   pip install "psycopg[binary]" dj-database-url
# then set in backend/.env, e.g.:
#   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/aeris_dev
DATABASE_URL = config("DATABASE_URL", default="")

if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
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
