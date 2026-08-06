# Architecture

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │     │   Backend    │     │  AI Service  │
│  React + TS  │────▶│  Django DRF  │◀────│  FastAPI     │
│  Nginx :80   │     │  Gunicorn    │     │  Uvicorn     │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     ┌──────┴───────┐      ┌──────┴───────┐
                     │   MySQL DB   │      │  Video       │
                     │   :3306      │      │  Streams     │
                     └──────────────┘      │  RTSP/HTTP   │
                                           └──────────────┘
                     ┌──────────────┐
                     │   Redis      │
                     │   :6379      │
                     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │   Celery     │
                     │   Workers    │
                     └──────────────┘
```

## Request Flow

### Normal Page Load

```
Browser ──▶ Nginx (:80)
              ├── /api/* ──▶ Backend (:8000) ──▶ MySQL
              ├── /ai/*   ──▶ AI Service (:8005)
              └── /*       ──▶ Frontend static files
```

### Incident Detection Flow

```
Video Source (RTSP/HTTP/MP4)
    │
    ▼
Stream Manager (stream_manager.py)
    │  Reads frames at configurable FPS
    ▼
Frame Processor (frame_processor.py)
    │  Resizes to 640×640, applies CLAHE enhancement
    ▼
YOLO Detector (yolo_detector.py)
    │  YOLOv11 inference → COCO class labels
    ▼
Fire Detector (fire_detector.py)
    │  HSV-based fire/smoke/water detection (complementary)
    ▼
Confidence Filter (confidence_filter.py)
    │  Per-type thresholds + temporal dedup (5s window)
    ▼
Incident Generator (incident_generator.py)
    │  POSTs to Backend API with evidence image
    ▼
Backend API
    ├── Creates Detection record
    ├── Creates Incident record (with dedup check)
    ├── Creates Notification (Alert/Warning/Info)
    └── Triggers Recommendation Engine
         │
         ▼
    Recommendation Engine (recommendation_engine.py)
         │  Generates responder + action recommendations
         │  Scores by priority (severity + confidence + duration + crowd)
         ▼
    Recommendations saved to database
         │
         ▼
    Frontend polls for updates (every 5-15s)
         │
         ▼
    Operator reviews → Accepts or Rejects
```

## Service Communication

### Frontend → Backend

- All CRUD operations via REST API at `/api/*`
- JWT authentication (30min access token, 1 day refresh token)
- Axios interceptor auto-refreshes tokens on 401

### Frontend → AI Service

- `/ai/*` endpoints (proxied through Nginx, rewrites `/ai/` prefix)
- `X-API-Key` header authentication
- Used for: registering cameras for AI, on-demand detection, video streaming

### AI Service → Backend

- `IncidentGenerator` sends POST requests to Backend API
- Uses `BackendAPI_URL` env var (`http://backend:8000/api` in Docker)
- Authenticates via Bearer token (`AI_SERVICE_API_KEY`)
- Sends evidence images as multipart file uploads

## Database Schema

### Core Relationships

```
User ──┬── records Incident
       ├── accepts Recommendation
       ├── receives Notification
       └── generates Report

Zone ──┬── contains Camera
       └── contains Incident

Camera ──┬── captures Incident
          └── produces Detection

Incident ──┬── has Detection
           ├── has Recommendation
           └── triggers Notification
```

### Key Model Fields

**Camera**: `name`, `rtsp_url`, `stream_type` (RTSP/HTTP/MP4/EMBED), `zone` (FK), `status` (Online/Offline/Error), `is_active`

**Incident**: `incident_type` (Fire/Smoke/Traffic Accident/Crowd/Flood/Road Obstruction/Illegal Dumping/Abandoned Object), `severity` (Low/Medium/High/Critical), `status` (Detected/Verified/Responding/Resolved/Dismissed), `camera` (FK), `zone` (FK), `confidence_score`, `evidence_image`, `duration`, `crowd_size`

**Recommendation**: `incident` (FK), `responder_type` (Barangay Tanod/Barangay Official/MDRRMO/BFP/PNP), `suggested_action`, `priority`, `explanation`, `reasoning`, `is_accepted`, `accepted_by` (FK)

## Nginx Configuration

Nginx serves as the single entry point on port 80:

| Path | Destination |
|------|------------|
| `/` | Frontend static files |
| `/api/` | Backend (`:8000`) |
| `/media/` | Backend (`:8000`) |
| `/ai/` | AI Service (`:8005`) — rewrites `/ai/` prefix |
| `/static/` | Backend (`:8000`) |

## Security Architecture

1. **JWT Authentication** — All API requests require valid JWT token
2. **API Key Authentication** — AI service requires `X-API-Key` header
3. **Role-Based Access** — Viewer/Operator/Admin roles with escalating permissions
4. **Path Traversal Protection** — Stream endpoint validates paths against MEDIA_ROOT
5. **Upload Validation** — Image uploads checked for content type and size limit
6. **Throttling** — 100 req/hr anonymous, 1000 req/hr authenticated
7. **CORS** — Restricted to configured origins
