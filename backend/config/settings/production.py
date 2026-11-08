"""
Production settings — Docker / server deployment.
DEBUG is hardcoded False and cannot be overridden by environment variables.
All security headers are enforced unconditionally once HTTPS is confirmed.
"""
import logging
from urllib.parse import urlparse

from decouple import Csv, config

from .base import *

logger = logging.getLogger(__name__)

# ── Debug — hardcoded, never toggleable via env ───────────────────────────────
DEBUG = False

# ── Hosts — explicit list required; no wildcard ───────────────────────────────
# Set ALLOWED_HOSTS in your .env to the actual domain/IP serving the app.
# Example: ALLOWED_HOSTS=aeris.barangay.local,192.168.1.10
ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())

# ── Database — MySQL ──────────────────────────────────────────────────────────
USE_MYSQL = config("USE_MYSQL", default=True, cast=bool)
DATABASE_URL = config("DATABASE_URL", default=None)

if DATABASE_URL:
    import dj_database_url
    DATABASES = {"default": dj_database_url.config(default=DATABASE_URL, conn_max_age=600)}
elif USE_MYSQL:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": config("DB_NAME"),
            "USER": config("DB_USER"),
            "PASSWORD": config("DB_PASSWORD"),
            "HOST": config("DB_HOST", default="db"),
            "PORT": config("DB_PORT", default="3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
        }
    }
else:
    # Fallback: SQLite — acceptable for single-node production only
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ── CORS — exact origin list, never wildcard ─────────────────────────────────
# Set CORS_ALLOWED_ORIGINS in your .env to the deployed frontend URL.
# Example: CORS_ALLOWED_ORIGINS=https://aeris.barangay.local
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv())
CORS_ALLOW_CREDENTIALS = True
# The bundled Electron app loads the SPA from the local AI sidecar origin,
# which is http://localhost:<port> — and that port can vary (8005, or the next
# free port if 8005 is already taken). Match any localhost port so the desktop
# bundle can reach this API while still refusing arbitrary remote origins.
# Hardcoded (not via decouple's Csv) because Csv's shlex parsing strips the
# backslashes in these regexes.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    cast=Csv(),
)
# CORS_ALLOW_ALL_ORIGINS is intentionally absent — never allow wildcard

# ── HTTPS / security headers ─────────────────────────────────────────────────
# TLS is expected in production: nginx terminates it and forwards
# X-Forwarded-Proto. Set SECURE_SSL_REDIRECT=False in .env only when another
# layer already redirects, never to make plain HTTP work.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"

# ── Channel layers — use Redis in production (not in-memory) ──────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL", default="redis://redis:6379/0")],
        },
    },
}

# ── Upload limits ────────────────────────────────────────────────────────────
# nginx already caps request bodies at 50 MB; these keep a single oversized
# field or file from being buffered into memory. Evidence frames are far
# smaller, so 10 MB of file memory is generous.
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ── Static / media ────────────────────────────────────────────────────────────
# Media is served via nginx in production; Django doesn't need to serve it.
MEDIA_ROOT = config("MEDIA_DIR", default=str(BASE_DIR / "media"))

# ── Cloudinary media storage (optional) ───────────────────────────────────────
# Set CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name> to send
# ImageField uploads (profile pictures, incident evidence, detection snapshots)
# to Cloudinary instead of the local disk. Leave it unset and everything keeps
# using MEDIA_ROOT behind nginx.
#
# Camera snapshots are written straight to MEDIA_ROOT by apps/cameras, so those
# files stay on disk either way — Cloudinary only takes Django field uploads.
def _clean_env_url(raw: str) -> str:
    """Trim whitespace and accidental wrapping quotes from an env value."""
    value = (raw or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1].strip()
    return value


CLOUDINARY_URL = _clean_env_url(config("CLOUDINARY_URL", default=""))

if CLOUDINARY_URL:
    _cloudinary = urlparse(CLOUDINARY_URL)
    if not (_cloudinary.username and _cloudinary.password and _cloudinary.hostname):
        # Cloudinary is optional, but a malformed value used to raise here.
        # Render runs `manage.py migrate` before the server starts, so that one
        # bad env var crash-looped the entire deployment. Warn loudly and keep
        # the local-disk storage instead of taking the API down.
        logger.warning(
            "Ignoring malformed CLOUDINARY_URL; expected "
            "cloudinary://<api_key>:<api_secret>@<cloud_name>. "
            "Media uploads will fall back to MEDIA_ROOT (%s).",
            MEDIA_ROOT,
        )
    else:
        # django-cloudinary-storage reads this dict, not CLOUDINARY_URL itself.
        CLOUDINARY_STORAGE = {
            "CLOUD_NAME": _cloudinary.hostname,
            "API_KEY": _cloudinary.username,
            "API_SECRET": _cloudinary.password,
            "SECURE": True,
        }
        STORAGES = {
            "default": {"BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"},
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
            },
        }
