"""
Production settings — Docker / server deployment.
DEBUG is hardcoded False and cannot be overridden by environment variables.
All security headers are enforced unconditionally once HTTPS is confirmed.
"""
from .base import *  # noqa: F401, F403
from decouple import config, Csv

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
    "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
    }

    # ── CORS — exact origin list, never wildcard ─────────────────────────────────
    # Set CORS_ALLOWED_ORIGINS in your .env to the deployed frontend URL.
    # Example: CORS_ALLOWED_ORIGINS=https://aeris.barangay.local
    CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv())
    CORS_ALLOW_CREDENTIALS = True
    CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    cast=Csv(),
    )
    # CORS_ALLOW_ALL_ORIGINS is intentionally absent — never allow wildcard

    # ── HTTPS / security headers ─────────────────────────────────────────────────
    # Enable these once TLS is confirmed working end-to-end.
    # SECURE_SSL_REDIRECT pushes all HTTP to HTTPS at the Django layer;
    # if nginx already handles the redirect, set SECURE_SSL_REDIRECT=False in .env.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
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

    # ── Static / media ────────────────────────────────────────────────────────────
    # Media is served via nginx in production; Django doesn't need to serve it.
    MEDIA_ROOT = config("MEDIA_DIR", default=str(BASE_DIR / "media"))  # noqa: F405
