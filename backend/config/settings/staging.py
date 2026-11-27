"""
Staging settings — mirrors production for pre-release validation.
DEBUG=False, MySQL, Redis channel layer, HTTPS security headers enforced.
Differs from production only in being more permissive where it helps testing
(e.g. API docs and admin may be enabled via env, CORS accepts the staging origin).
"""
from .base import *  # noqa: F401, F403
from decouple import Csv, config

# ── Debug — hardcoded False; staging behaves like production ──────────────────
DEBUG = False

# ── Hosts — staging domain(s) only, no wildcard ───────────────────────────────
ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())

# ── Database — MySQL (same as production) ─────────────────────────────────────
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
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ── CORS — exact staging origin(s) ────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv())
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", cast=Csv())

# ── HTTPS / security headers ──────────────────────────────────────────────────
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

# ── Channel layers — Redis (staging, not in-memory) ───────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL", default="redis://redis:6379/0")],
        },
    },
}

# ── Email — Brevo (staging) ───────────────────────────────────────────────────
BREVO_API_KEY = config("BREVO_API_KEY", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="Aeris <staging@example.com>")

# ── Upload limits ─────────────────────────────────────────────────────────────
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# ── Static / media ────────────────────────────────────────────────────────────
MEDIA_ROOT = config("MEDIA_DIR", default=str(BASE_DIR / "media"))

# ── Cloudinary media storage (optional) ───────────────────────────────────────
from urllib.parse import urlparse


def _clean_env_url(raw: str) -> str:
    value = (raw or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1].strip()
    return value


CLOUDINARY_URL = _clean_env_url(config("CLOUDINARY_URL", default=""))

if CLOUDINARY_URL:
    _cloudinary = urlparse(CLOUDINARY_URL)
    if _cloudinary.username and _cloudinary.password and _cloudinary.hostname:
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

# ── Docs / admin — opt-in for staging testing ─────────────────────────────────
EXPOSE_API_DOCS = config("EXPOSE_API_DOCS", default=True, cast=bool)
EXPOSE_DJANGO_ADMIN = config("EXPOSE_DJANGO_ADMIN", default=True, cast=bool)

# ── Redis & Celery ────────────────────────────────────────────────────────────
REDIS_URL = config("REDIS_URL", default="redis://redis:6379/0")
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Manila"

# ── Web Push (VAPID) ─────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY = config("VAPID_PUBLIC_KEY", default="")
VAPID_PRIVATE_KEY = config("VAPID_PRIVATE_KEY", default="")
VAPID_CLAIMS_SUB = config("VAPID_CLAIMS_SUB", default="mailto:staging@example.com")

# ── Public app origin ────────────────────────────────────────────────────────
PUBLIC_APP_URL = config("PUBLIC_APP_URL", default="")

# ── Internal service key ──────────────────────────────────────────────────────
INTERNAL_API_KEY = config("INTERNAL_API_KEY", default="")

# ── AI service key ────────────────────────────────────────────────────────────
AI_SERVICE_API_KEY = config("AI_SERVICE_API_KEY", default="")
