# AERIS — AI-Powered Barangay CCTV Incident Detection System

Welcome to the AERIS documentation. This folder holds the **stable, citable** version of project documentation. Working drafts live in `workspace/docs/`; finalized versions are copied here.

## Structure

```
docs/
├── index.md                  ← this file
├── architecture/             ← system design, data flow, ERDs, sequence diagrams
│   ├── architecture.md       ← three-tier architecture overview + request flows
│   └── incident-lifecycle.md ← detection → verification → resolution lifecycle
├── setup/                    ← how to run, operate, and troubleshoot the system
│   ├── setup-guide.md        ← local dev + Docker quick start
│   ├── api-reference.md      ← full API endpoint reference
│   ├── admin-guide.md        ← user roles, configuration, maintenance
│   ├── user-guide.md         ← operator walkthrough
│   ├── troubleshooting.md    ← common issues and fixes
│   └── render-deploy.md      ← cloud deployment on Render
└── thesis/                   ← capstone defense materials (see below)
```

## Quick Links

| Goal | Document |
|------|----------|
| Understand the system | [Architecture](architecture/architecture.md) |
| Run it locally | [Setup Guide](setup/setup-guide.md) |
| Look up an endpoint | [API Reference](setup/api-reference.md) |
| Manage users / cameras | [Admin Guide](setup/admin-guide.md) |
| Use the app day-to-day | [User Guide](setup/user-guide.md) |
| Debug an issue | [Troubleshooting](setup/troubleshooting.md) |
| Deploy to Render | [Render Deploy](setup/render-deploy.md) |
| How incidents work | [Incident Lifecycle](architecture/incident-lifecycle.md) |

## System Summary

| Service | Technology | Purpose |
|---------|-----------|---------|
| **Backend** | Django REST Framework + Channels | Auth, data, WebSocket, business logic |
| **AI Service** | FastAPI + YOLOv11 | Video stream processing, detection, recommendations |
| **Frontend** | React + Vite + Mantine UI | Monitoring, review, analytics, reporting |

Run everything with:
```bash
docker compose up -d
```

See [Setup Guide](setup/setup-guide.md) for full instructions.

## thesis/

Place capstone-specific materials here:
- Defense presentation slides
- Use-case diagrams, ERDs, sequence diagrams (finalized versions)
- SRS / SDD documents
- Panelist feedback notes
- Approved final paper / manuscript

Working versions of these belong in `workspace/docs/` first; copy to `docs/thesis/` once finalized.
