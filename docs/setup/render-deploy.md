# Render Deployment Guide

## Architecture on Render

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend     │     │  Backend      │     │  AI Service   │
│  (Static Site)│────▶│  (Web Service)│────▶│  (Web Service)│
│  render.com   │     │  Gunicorn     │     │  Uvicorn      │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │                      │
                   ┌────────▼───────┐     ┌────────▼──────┐
                   │  PostgreSQL    │     │  Redis         │
                   │  (Render Addon)│     │  (Render Addon)│
                   └────────────────┘     └───────────────┘
```

## Prerequisites

- **Render account** (free tier works, but AI service needs at least **Starter** $7/mo)
- **GitHub repo** with your code pushed
- **Cloudinary account** (free) — for evidence image storage (Render free tier has no persistent disk)

## Step 1: Add Dependencies for Production

### 1a. Backend — add whitenoise + cloudinary + postgres

```
cd backend
pip install whitenoise django-storages cloudinary dj-database-url psycopg2-binary
pip freeze > requirements.txt
```

### 1b. Update `backend/config/settings.py` — add PostgreSQL support

After the existing MySQL/SQLite block (around line 94), add PostgreSQL detection:

```python
# Database
USE_MYSQL = config("USE_MYSQL", default=False, cast=bool)
DATABASE_URL = config("DATABASE_URL", default=None)
if DATABASE_URL:
    import dj_database_url
    DATABASES = {"default": dj_database_url.config(default=DATABASE_URL, conn_max_age=600)}
elif USE_MYSQL:
    ...existing MySQL block...
else:
    ...existing SQLite block...
```

### 1b. Update `backend/config/settings.py` — add whitenoise middleware and cloudinary config

Add `whitenoise` to middleware (right after `SecurityMiddleware`):

```python
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",    # ← add this
    ...
]
```

Add to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    "storages",  # ← add this
    "cloudinary",  # ← add this
]
```

Add at the bottom of settings.py for Cloudinary media storage:

```python
import cloudinary
import cloudinary.uploader
import cloudinary.api

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": config("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": config("CLOUDINARY_API_KEY"),
    "API_SECRET": config("CLOUDINARY_API_SECRET"),
}

DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"
```

### 1c. Create `backend/Procfile`

```
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile -
worker: celery -A config worker -l info --concurrency 2
```

### 1d. Create `backend/runtime.txt`

```
python-3.11.9
```

## Step 2: Prepare the AI Service for Render

### 2a. Create `ai-service/Procfile`

```
web: uvicorn app.api:app --host 0.0.0.0 --port $PORT --workers 1
```

### 2b. Reduce AI service build time

The `torch` + `ultralytics` packages are ~3 GB. On Render free tier, the build will likely **time out** (15 min limit). Options:

**Option A (Recommended — Starter tier $7/mo)**:
- Use a `render.yaml` with `buildFilter` to avoid rebuilding on every push
- Or use Render's **Docker** deployment with the existing `Dockerfile` (bypasses build timeout)

**Option B (Cheaper — use CPU-only PyTorch)**:
Replace `torch` in requirements.txt with `torch --index-url https://download.pytorch.org/whl/cpu` by moving to a separate install command.

**Option C (Use Render Pre-built API)**:
Use the Render dashboard → **New Web Service** → select your repo → set **Root Directory** to `ai-service` → **Runtime** = `Docker` → it uses the Dockerfile.

### 2c. AI service startup script

Create `ai-service/start.sh`:

```bash
#!/bin/bash
# Pre-download YOLO model on cold start
python -c "from ultralytics import YOLO; YOLO('yolo11n.pt')"
exec uvicorn app.api:app --host 0.0.0.0 --port $PORT --workers 1
```

Make executable: `chmod +x ai-service/start.sh`

Update Procfile:
```
web: ./start.sh
```

## Step 3: Prepare Frontend

### 3a. Create `frontend/render.yaml` (optional — or use dashboard)

The frontend is deployed as a **Static Site** on Render — no special config files needed.

### 3b. Add environment variable during build

In the Render dashboard for your Static Site, set:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |
| `VITE_AI_URL` | `https://your-ai-service.onrender.com` |

## Step 4: Create `render.yaml` (Infrastructure as Code)

Place this in your repo root (`Incident/render.yaml`):

```yaml
services:
  # ── Backend ──
  - type: web
    name: barangay-backend
    env: python
    buildCommand: |
      pip install -r requirements.txt
      python manage.py collectstatic --noinput
    startCommand: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120
    healthCheckPath: /api/accounts/me/
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings
      - key: DEBUG
        value: "False"
      - key: USE_HTTPS
        value: "True"
      - key: SECRET_KEY
        generateValue: true
      - key: ALLOWED_HOSTS
        value: ".onrender.com,localhost"
      - key: CORS_ALLOWED_ORIGINS
        value: "https://your-frontend.onrender.com"
      - key: DATABASE_URL
        fromDatabase:
          name: barangay-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: barangay-redis
          property: connectionString
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false
      - key: AI_SERVICE_API_KEY
        sync: false
      - key: BACKEND_API_URL
        value: "https://your-backend.onrender.com/api"
    disk:
      name: media
      mountPath: /app/media
      sizeGB: 1

  # ── Celery Worker ──
  - type: worker
    name: barangay-worker
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A config worker -l info --concurrency 2
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings
      - key: DEBUG
        value: "False"
      - key: SECRET_KEY
        fromService:
          type: web
          name: barangay-backend
          property: envVars.SECRET_KEY
      - key: DATABASE_URL
        fromDatabase:
          name: barangay-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: barangay-redis
          property: connectionString

  # ── AI Service ──
  - type: web
    name: barangay-ai
    env: docker
    dockerfilePath: ai-service/Dockerfile
    dockerContext: ai-service
    healthCheckPath: /health
    envVars:
      - key: BACKEND_API_URL
        fromService:
          type: web
          name: barangay-backend
          property: hostport
      - key: AI_SERVICE_API_KEY
        sync: false
      - key: DEVICE
        value: cpu
      - key: DEFAULT_CONF_THRESHOLD
        value: "0.5"

  # ── Frontend ──
  - type: static-site
    name: barangay-frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: ./frontend/dist
    pullRequestPreviewsEnabled: false
    envVars:
      - key: VITE_API_URL
        fromService:
          type: web
          name: barangay-backend
          property: host

databases:
  - name: barangay-db
    plan: free
    postgresMajorVersion: 16

redis:
  - name: barangay-redis
    plan: free
    maxmemoryPolicy: allkeys-lru
```

## Step 5: Deploy via Render Dashboard (Easier)

If you prefer not to use `render.yaml`, follow these steps manually:

### 5a. Create PostgreSQL database
- Render Dashboard → **New +** → **PostgreSQL**
- Name: `barangay-db`, Plan: **Free**
- Copy the **Internal Database URL**

### 5b. Create Redis
- Render Dashboard → **New +** → **Redis**
- Name: `barangay-redis`, Plan: **Free**
- Copy the **Connection String**

### 5c. Deploy Backend
- **New +** → **Web Service**
- Connect your GitHub repo
- **Name**: `barangay-backend`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**:
  ```
  pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
  ```
- **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile -`
- **Plan**: **Starter** ($7/mo) minimum (Free tier 512 MB RAM may crash)
- **Health Check Path**: `/api/accounts/me/`
- **Environment Variables**:

| Variable | Value |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings` |
| `DEBUG` | `False` |
| `USE_HTTPS` | `True` |
| `SECRET_KEY` | _generate a random 64-char key_ |
| `ALLOWED_HOSTS` | `.onrender.com,localhost` |
| `CORS_ALLOWED_ORIGINS` | `https://barangay-frontend.onrender.com` |
| `DATABASE_URL` | _paste from step 5a_ |
| `REDIS_URL` | _paste from step 5b_ |
| `USE_MYSQL` | `False` |
| `AI_SERVICE_API_KEY` | `ai-service-key` (or a random secret) |
| `BACKEND_API_URL` | `https://barangay-backend.onrender.com/api` |
| `CLOUDINARY_CLOUD_NAME` | _from Cloudinary dashboard_ |
| `CLOUDINARY_API_KEY` | _from Cloudinary dashboard_ |
| `CLOUDINARY_API_SECRET` | _from Cloudinary dashboard_ |

- **Add Disk** (for media files): mount `/app/media`, 1 GB

### 5d. Deploy AI Service
- **New +** → **Web Service**
- **Name**: `barangay-ai`
- **Root Directory**: `ai-service`
- **Runtime**: **Docker** (uses the existing Dockerfile)
- **Plan**: **Starter** ($7/mo) — Free tier will OOM due to torch
- **Health Check Path**: `/health`
- **Environment Variables**:

| Variable | Value |
|---|---|
| `BACKEND_API_URL` | `https://barangay-backend.onrender.com/api` |
| `AI_SERVICE_API_KEY` | `ai-service-key` (same as backend) |
| `DEVICE` | `cpu` |
| `DEFAULT_CONF_THRESHOLD` | `0.5` |

### 5e. Deploy Frontend
- **New +** → **Static Site**
- **Name**: `barangay-frontend`
- **Root Directory**: `frontend`
- **Build Command**: `npm ci && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://barangay-backend.onrender.com/api` |

## Step 6: Post-Deployment

### 6a. Create superuser
After backend deploys, go to Render dashboard → **barangay-backend** → **Shell** and run:

```
python manage.py createsuperuser
```

### 6b. Update CORS
After frontend is live, update the backend's `CORS_ALLOWED_ORIGINS` to include the frontend URL:

```
https://barangay-frontend.onrender.com
```

### 6c. Update ALLOWED_HOSTS
Add your custom domain if you have one:

```
.onrender.com,localhost,yourdomain.com
```

## Step 7: Custom Domain (Optional)

### Backend
- Render Dashboard → **barangay-backend** → **Settings** → **Custom Domain**
- Add `api.yourdomain.com`
- Update DNS with the provided CNAME target
- Add to `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`

### Frontend
- Render Dashboard → **barangay-frontend** → **Settings** → **Custom Domain**
- Add `yourdomain.com`
- Update DNS

## Cost Breakdown

| Service | Plan | Cost/mo |
|---|---|---|
| Backend web service | Starter | $7 |
| AI service web service | Starter | $7 |
| Celery worker | Starter | $7 |
| Frontend static site | Free | $0 |
| PostgreSQL | Free | $0 |
| Redis | Free | $0 |
| Cloudinary (media) | Free | $0 |
| **Total** | | **$21/mo** |

**Cost-saving tip**: If you don't need real-time AI detection, skip the AI service on Render and run it on a local machine that has access to your cameras. The backend works without AI — you can manually create incidents.

## Troubleshooting

| Problem | Likely Fix |
|---|---|
| Build times out (AI service) | Use Docker runtime instead of Python; add `--timeout 900` to build command |
| `torch` OOM on free tier | Upgrade to Starter ($7/mo) — free tier has only 512 MB RAM |
| Static files 404 | Ensure `whitenoise` middleware is in the correct position; run `collectstatic` |
| Media uploads fail | Set up Cloudinary with `DEFAULT_FILE_STORAGE`; Render free tier has no persistent disk |
| 502 Bad Gateway | Increase `--timeout 120` in gunicorn; check logs for startup errors |
| CORS errors | Verify `CORS_ALLOWED_ORIGINS` matches the frontend URL exactly (no trailing slash) |
| Database connection refused | Check Render dashboard for the correct internal connection string |
| Celery tasks not running | Ensure `REDIS_URL` is set and the worker service is deployed |
