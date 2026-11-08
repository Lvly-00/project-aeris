# syntax=docker/dockerfile:1

# ── Builder — resolves and installs Python dependencies into a venv ──────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build-only toolchain. psycopg[binary] ships wheels, but a source fallback
# needs libpq headers and a compiler; none of this reaches the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements/production.txt requirements/production.txt
RUN pip install -r requirements/production.txt


# ── Runtime — application and venv only ──────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production \
    DJANGO_ENV=production \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY . .

# Static must exist here because nginx serves it from the shared volume;
# media gets the same treatment for evidence frames.
RUN mkdir -p media/snapshots media/evidence staticfiles \
    && addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

# Render (and most PaaS hosts) supply $PORT; compose maps 8000 directly.
EXPOSE 8000

# Apply migrations, then idempotently ensure baseline data exists, then start
# Daphne (ASGI) so both HTTP and /ws/ work. Gunicorn is WSGI-only and cannot
# serve Channels, so it must never be the production entry point.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_lookups && python manage.py seed_default_admin && daphne -b 0.0.0.0 -p ${PORT:-8000} config.asgi:application"]
