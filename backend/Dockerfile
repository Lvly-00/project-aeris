FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

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
# Run migrations before starting Gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT"]