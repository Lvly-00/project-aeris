FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.production.txt .
RUN pip install --no-cache-dir -r requirements.production.txt

COPY . .

# Run as non-root user (brief §5.9)
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8005

# Entry point updated: app.api -> app.main after restructure
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
