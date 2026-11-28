# project-aeris

**AERIS** — AI-Assisted Emergency Response and Incident Surveillance System for Barangay Sampaloc, Apalit, Pampanga.

AI-powered CCTV monitoring that detects incidents (fire, smoke, vehicle accidents), creates and broadcasts them in real time, and coordinates barangay responders through dispatch messages — on a desktop (Electron) portal for operators and a mobile PWA for field responders.

## Roles

| Role | Platform | Capabilities |
|------|----------|--------------|
| **CCTV Chief** | Desktop + Mobile PWA | Full access: accounts, cameras, audit, settings; verify/dismiss incidents; final dispatch authority |
| **CCTV Operator** | Desktop + Mobile PWA | Monitor cameras, verify/dismiss incidents, dispatch |
| **Barangay Tanod** | Mobile PWA | Receive dispatch messages & notifications, view incident details |

Login is **email-only** (JWT). The initial administrator is created with
`python manage.py seed_default_admin`, which reads `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from the environment. Never commit real credentials.

## Architecture

| Service | Technology | Port |
|---------|-----------|------|
| Backend | Django REST Framework + Channels (WebSocket) | 8000 |
| AI Service | FastAPI + YOLOv11 + OpenCV (fire/smoke/accident detection) | 8005 |
| Frontend | React + Vite + Mantine UI → Electron desktop app + mobile PWA | 5173 (dev) |
| Database | MySQL (SQLite for local dev) | 3306 |
| Cache/Broker | Redis + Celery | 6379 |

```
CCTV cameras ──▶ AI service (YOLOv11 inference, confidence filters)
                    │ POST /api/incidents/create-from-detection/
                    ▼
              Django backend ──▶ WebSocket broadcast ──▶ all clients
                    │
                    ├─ Operators verify → dispatch → auto-message to Tanods
                    └─ Incident state machine enforced server-side:
                       Detected → Verified/Dismissed · Verified → Dispatched/Dismissed
                       Dispatched → Resolved · Dismissed → Detected (reopen)
```

## Quick Start

### Docker

```bash
cp .env.example .env          # fill in secrets
docker compose up -d
# Frontend: http://localhost · API docs: http://localhost/api/docs/
```

### Docker (staging)

Staging reuses the production images tagged `:staging` and runs
`config.settings.staging` (DEBUG=False, MySQL, Redis channel layer, HTTPS
headers). Docs and admin are on by default for testing.

```bash
cp .env.staging.example .env   # fill in staging secrets, set AERIS_TAG=staging
docker compose \
  -f docker-compose.yml \
  -f docker-compose.staging.yml \
  up -d
# Frontend: http://localhost · API docs: http://localhost/api/docs/
```

Run staging and production on the same host by setting a different compose
project name so containers, networks and volumes don't collide:

```bash
COMPOSE_PROJECT_NAME=aeris-staging docker compose \
  -f docker-compose.yml \
  -f docker-compose.staging.yml \
  up -d
```

The CI/CD pipeline already builds and pushes `:staging` images on pushes to the
`staging` branch, and the `deploy` job can roll out to a staging host via the
`STAGING_DEPLOY_*` secrets (see `.github/workflows/ci-cd.yml`).


### Manual (development)

```bash
# Backend
cd backend
python -m venv venv; .\venv\Scripts\activate   # Windows
pip install -r requirements.txt
python manage.py migrate                        # seeds lookups (roles, types, statuses)
python manage.py seed_default_admin             # reads ADMIN_EMAIL / ADMIN_PASSWORD from env
python manage.py runserver 0.0.0.0:8000 --noreload

# AI service
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8005

# Frontend
cd frontend
npm install
npm run dev                                     # http://localhost:5173
```

> **Run only ONE Django process in dev.** Channels uses an in-memory layer per
> process — two `runserver` instances silently split WebSocket delivery.

## Deployment & Desktop Builds

The backend, database and AI service run centrally on the deployed server;
both clients are thin:

- **PWA (web)**: `cd frontend && npm run build` (same as `build:pwa`)
  produces `dist/` — an installable PWA (manifest + service worker + icons).
  Serve it from the **same origin** as `/api`, `/ws` and `/ai` (the nginx /
  Docker setup already does). A **Download App** button under the login form
  triggers the browser's native install prompt.
- **Desktop (Electron)**: `scripts/build-desktop.ps1` or
  `npm run build:desktop`. The installer no longer bundles Django, Python or
  the AI service — it loads the deployed site directly. The server URL comes
  from (in order): `AERIS_SERVER_URL` env var → `server-url.txt` in the app
  data folder (`%APPDATA%\Aeris\server-url.txt`) → default
  `http://localhost:8000`.

## Repository Layout

```
backend/       Django project (apps: accounts, lookups, cameras, incidents,
               detections, dispatch, notifications, analytics, contacts, audit, ai_config)
ai-service/    FastAPI detection pipeline (FrameReader → YOLO → ConfidenceFilter)
frontend/      Shared React codebase
  src/desktop/ Electron portal (cameras, accounts, audit)
  src/pwa/     Mobile PWA (dashboard, incidents, history, tanod messages)
  src/shared/  API client, WebSocket service, types, utils
docs/          Legacy docs (see workspace/docs for current documentation)
workspace/docs Current documentation: architecture, ERD, API reference,
               setup/user/admin guides, feature requirements
```
