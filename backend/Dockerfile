FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Pin production settings so manage.py (migrate/seed) and Daphne both target the
# deployed database. Without this, manage.py falls back to config.settings.
# development (SQLite) even inside the container. A platform-provided
# DJANGO_SETTINGS_MODULE still overrides this default at runtime.
ENV DJANGO_SETTINGS_MODULE=config.settings.production
ENV DJANGO_ENV=production

# ── System dependencies ──────────────────────────────────────────────────────
# PostgreSQL client libraries for Neon PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ──────────────────────────────────────────────────────
COPY requirements/production.txt requirements/production.txt

RUN pip install --no-cache-dir -r requirements/production.txt

# ── Application ──────────────────────────────────────────────────────────────
COPY . .

# Create required media directories
RUN mkdir -p media/snapshots media/evidence

# ── Non-root user ─────────────────────────────────────────────────────────────
RUN addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

# Render supplies $PORT
EXPOSE 8000

# ── Production server ─────────────────────────────────────────────────────────
# Every start/redeploy: apply migrations, then idempotently ensure the baseline
# data (lookup tables, default/extra admins, AI config) exists. Both seed
# commands use get_or_create, so existing data is preserved and the result is
# identical on every deploy — never use `flush` here, it deletes live data.
# Finally start Daphne (ASGI) so HTTP and WebSockets (/ws/incidents/) both work;
# Gunicorn (WSGI) cannot serve Channels.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_lookups && python manage.py seed_default_admin && daphne -b 0.0.0.0 -p $PORT config.asgi:application"]