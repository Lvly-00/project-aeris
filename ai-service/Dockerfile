# Must match the interpreter in .github/workflows/ci.yml. The pinned numpy
# (2.5.x) requires Python >= 3.12.
FROM python:3.12-slim

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
# CPU-only torch: this service never uses CUDA, and the default PyPI wheel drags
# in several GB of NVIDIA libraries. 2.13.0+cpu sorts above 2.13.0 under PEP 440,
# so pip prefers the CPU build when both indexes are searched.
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.production.txt

COPY . .

# Run as non-root user (brief §5.9)
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8005

# Entry point updated: app.api -> app.main after restructure
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
