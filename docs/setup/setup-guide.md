# Setup Guide

## Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| Docker & Docker Compose | Latest | Recommended for production |
| Python | 3.11+ | Required for manual backend/AI service setup |
| Node.js | 20+ | Required for manual frontend setup |
| Git | Latest | For cloning the repository |

## Quick Start (Docker)

This is the recommended approach for both production and evaluation.

```bash
# 1. Clone the repository
git clone <repository-url>
cd Incident

# 2. Configure environment (optional - defaults work for local dev)
cp .env.example .env
# Edit .env if needed (SECRET_KEY, DB settings, etc.)

# 3. Start all services
docker-compose up -d

# 4. Create a superuser
docker-compose exec backend python manage.py createsuperuser

# 5. Access the application
#    Frontend:    http://localhost
#    API (Swagger): http://localhost/api/docs/
#    AI Health:   http://localhost:8005/health
```

### Stopping and Cleaning Up

```bash
# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

## Manual Setup (Development)

### 1. Backend (Django)

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` for local development:
```env
DEBUG=True
USE_MYSQL=False          # Uses SQLite for local dev
SECRET_KEY=your-secret-key
```

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
# Backend runs at http://localhost:8000
```

### 2. AI Service (FastAPI)

```bash
cd ai-service

# Create virtual environment
python -m venv venv
# Activate it

# Install dependencies
pip install -r requirements.txt

# Start the service
python -m app.main
# AI service runs at http://localhost:8005
```

### 3. Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend runs at http://localhost:5173
```

### 4. Verify Everything is Working

```bash
# Backend health check
curl http://localhost:8000/api/docs/

# AI service health check
curl http://localhost:8005/health

# Frontend
# Open http://localhost:5173 in your browser
```

## Configuration Reference

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | Django secret key — generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `False` | Enable debug mode (development only) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `USE_MYSQL` | `True` | Use MySQL instead of SQLite |
| `DB_NAME` | `barangay_cctv` | MySQL database name |
| `DB_USER` | `barangay_user` | MySQL user |
| `DB_PASSWORD` | `barangay_pass_2024` | MySQL password |
| `DB_HOST` | `db` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery broker URL |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost` | Allowed CORS origins |

#### AI Service

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_API_URL` | `http://backend:8000/api` | Backend API URL (for creating incidents) |
| `AI_SERVICE_API_KEY` | `ai-service-key` | API key for authenticating to the AI service |
| `AI_SERVICE_HOST` | `0.0.0.0` | Bind address |
| `AI_SERVICE_PORT` | `8005` | Port |
| `DEVICE` | `cpu` | PyTorch device (`cpu` or `cuda`) |
| `YOLO_MODEL_PATH` | `yolo11n.pt` | Path to YOLO model weights |
| `DEFAULT_CONF_THRESHOLD` | `0.5` | Default confidence threshold (0.0–1.0) |
| `API_TIMEOUT` | `10` | Backend API timeout in seconds |

#### Frontend (`vite.config.ts` or `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Backend URL (dev proxy target) |
| `VITE_AI_URL` | `http://localhost:8005` | AI service URL (dev proxy target) |

## Adding a Camera

### Via the Frontend

1. Navigate to **Cameras** page
2. Click **Add Camera**
3. Fill in:
   - **Name**: A descriptive label (e.g., "Main Gate Camera")
   - **RTSP URL**: The video source URL (see Stream Types below)
   - **Stream Type**: `RTSP`, `HTTP`, `MP4`, or `EMBED`
   - **Zone**: Assign to a barangay zone
   - **Location**: Latitude/Longitude for GIS mapping
4. Click **Save**

### Stream Types

| Type | Format | Description |
|------|--------|-------------|
| **RTSP** | `rtsp://<ip>:<port>/<path>` | Real-time streaming protocol (IP cameras) |
| **HTTP** | `http://<ip>:<port>/<path>` | HTTP live stream (MJPEG) |
| **MP4** | `videos/<filename>.mp4` | Local MP4 file (for testing) |
| **EMBED** | URL to a web page | Embeds an iframe (e.g., SkylineWebcams) |

### Via the API

```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Gate",
    "rtsp_url": "rtsp://192.168.1.100:554/stream1",
    "stream_type": "RTSP",
    "zone": 1,
    "latitude": 14.5995,
    "longitude": 120.9842,
    "is_active": true
  }'
```

## Test Video Files

Sample MP4 files are included for testing:
- `sample_burning_house.mp4`
- `sample_car_accident.mp4`
- `sample_flood.mp4`
- `sample_smoke.mp4`

These can be added as MP4-type cameras for testing the detection pipeline without live cameras.
