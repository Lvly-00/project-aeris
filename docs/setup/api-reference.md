# API Reference

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `http://localhost/api/` |
| Local dev (backend) | `http://localhost:8000/api/` |
| Local dev (AI) | `http://localhost:8005/` |

## Authentication

### JWT Tokens

Most backend endpoints require JWT authentication.

```bash
# Obtain token
POST /api/auth/token/
{
  "username": "admin",
  "password": "admin123"
}
# Response: { "access": "<token>", "refresh": "<token>" }

# Use token
Authorization: Bearer <token>

# Refresh token
POST /api/auth/token/refresh/
{ "refresh": "<refresh-token>" }
```

### AI Service API Key

All AI service endpoints (except `/health`) require:

```
X-API-Key: ai-service-key
```

### Error Responses

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200` — Success
- `201` — Created
- `400` — Bad request (validation error)
- `401` — Unauthenticated
- `403` — Forbidden (wrong role or API key)
- `404` — Not found
- `429` — Too many requests (throttled)

---

## Backend Endpoints

### Authentication

#### `POST /api/auth/token/`
Obtain JWT access and refresh tokens.

#### `POST /api/auth/token/refresh/`
Refresh an expired access token using a refresh token.

#### `POST /api/auth/token/verify/`
Verify that a token is still valid.

#### `POST /api/accounts/register/`
Register a new user. Public endpoint (no auth required).
```json
{
  "username": "operator1",
  "password": "securepass123",
  "password2": "securepass123",
  "email": "operator1@barangay.gov.ph",
  "role": "Operator"
}
```

#### `GET /api/accounts/me/`
Get current user's profile. (Auth required)

#### `PATCH /api/accounts/me/`
Update current user's profile.

#### `GET /api/accounts/`
List all users. Filter: `?role=Admin|Operator|Viewer` (Admin only)

---

### Zones

#### `GET /api/zones/`
List all barangay zones.

#### `POST /api/zones/`
Create a zone.
```json
{
  "name": "Barangay Santo Niño",
  "barangay": "Zone 1",
  "boundary_coords": [[14.5995, 120.9842], [14.6000, 120.9850], ...],
  "description": "Main barangay zone covering the town plaza"
}
```

#### `GET /api/zones/{id}/`
Zone details with camera and incident counts.

#### `PUT /api/zones/{id}/`
Full update.

#### `PATCH /api/zones/{id}/`
Partial update.

#### `DELETE /api/zones/{id}/`
Delete zone.

---

### Cameras

#### `GET /api/cameras/`
List all cameras.

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search name, RTSP URL |
| `status` | string | `Online`, `Offline`, `Error` |
| `stream_type` | string | `RTSP`, `HTTP`, `MP4`, `EMBED` |
| `zone` | int | Zone ID |
| `is_active` | bool | Active/inactive |

#### `POST /api/cameras/`
Add a camera.
```json
{
  "name": "Main Entrance",
  "rtsp_url": "rtsp://192.168.1.100:554/stream1",
  "stream_type": "RTSP",
  "zone": 1,
  "latitude": 14.5995,
  "longitude": 120.9842,
  "is_active": true
}
```

#### `GET /api/cameras/{id}/`
Camera details.

#### `PUT /api/cameras/{id}/`
Full update.

#### `PATCH /api/cameras/{id}/`
Partial update.

#### `DELETE /api/cameras/{id}/`
Delete camera.

#### `PATCH /api/cameras/{id}/status/`
Update camera status.
```json
{
  "status": "Online",
  "last_seen": "2026-07-05T19:00:00+08:00"
}
```

#### `POST /api/cameras/{id}/snapshot/`
Upload a snapshot image (multipart form).
```json
{
  "image": "<binary image file>"
}
```
Constraints: image files only (content-type `image/*`), max 10MB.

#### `GET /api/cameras/{id}/stream/`
Stream an MP4 video file. Auth via header or `?token=` query param.

---

### Incidents

#### `GET /api/incidents/`
List incidents.

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `incident_type` | string | Filter by type |
| `severity` | string | `Low`, `Medium`, `High`, `Critical` |
| `status` | string | `Detected`, `Verified`, `Responding`, `Resolved`, `Dismissed` |
| `camera` | int | Camera ID |
| `zone` | int | Zone ID |
| `start_date` | datetime | Filter from date |
| `end_date` | datetime | Filter to date |

#### `POST /api/incidents/`
Create incident manually.
```json
{
  "incident_type": "Fire",
  "severity": "High",
  "description": "Fire detected at the market area",
  "camera": 1,
  "zone": 2,
  "location_lat": 14.5995,
  "location_lng": 120.9842,
  "confidence_score": 0.89
}
```

#### `GET /api/incidents/{id}/`
Incident details with recommendations and detections.

#### `PUT /api/incidents/{id}/`
Full update.

#### `PATCH /api/incidents/{id}/`
Partial update.

#### `DELETE /api/incidents/{id}/`
Delete incident.

#### `POST /api/incidents/create-from-detection/`
Create incident from AI detection (internal use, AI service calls this).
```json
{
  "incident_type": "Fire",
  "severity": "High",
  "camera": 1,
  "zone": 1,
  "confidence_score": 0.92,
  "evidence_image": "<base64 or multipart file>",
  "duration": 30,
  "crowd_size": 5
}
```
Dedup: If an incident of the same type from the same camera was created within the last 10 minutes (and is not Dismissed), it returns the existing incident instead of creating a new one.

#### `PATCH /api/incidents/{id}/status/`
Transition incident status.
```json
{
  "status": "Verified"
}
```
Valid transitions:
- `Detected → Verified`
- `Verified → Responding`
- `Responding → Resolved`
- `Any → Dismissed`

Timestamps auto-set: `verified_at`, `responded_at`, `resolved_at`

#### `GET /api/incidents/dashboard-stats/`
Aggregated dashboard statistics.

**Response:**
```json
{
  "active_incidents": 5,
  "total_cameras": 12,
  "pending_recommendations": 3,
  "today_incidents": 8,
  "avg_response_time": "15.3 minutes",
  "total_incidents": 156,
  "incidents_by_type": { "Fire": 12, "Smoke": 8, ... },
  "severity_distribution": { "Low": 5, "Medium": 10, "High": 3, "Critical": 1 }
}
```

---

### Detections

#### `GET /api/detections/`
List detections. Filter by `camera`, `incident_type`, `start_date`, `end_date`.

#### `POST /api/detections/`
Create detection record.

#### `GET /api/detections/{id}/`
Detection details (includes bbox_coords, snapshot_image, FPS).

---

### Recommendations

#### `GET /api/recommendations/`
List recommendations. Filter by `incident`, `responder_type`, `suggested_action`, `priority`, `is_accepted`.

#### `POST /api/recommendations/`
Create recommendation.

#### `GET /api/recommendations/{id}/`
Recommendation details.

#### `POST /api/recommendations/{id}/respond/`
Accept or reject a recommendation.
```json
{
  "is_accepted": true
}
```
Returns updated recommendation. Once set, `is_accepted` cannot be changed.

---

### Notifications

#### `GET /api/notifications/`
List notifications. Filter by `is_read`, `notification_type`, `priority`.

#### `POST /api/notifications/{id}/mark-read/`
Mark a single notification as read.

#### `POST /api/notifications/mark-all-read/`
Mark all notifications as read for the current user.

#### `GET /api/notifications/unread_count/`
```json
{ "count": 7 }
```

---

### Reports

#### `GET /api/reports/`
List reports.

#### `GET /api/reports/{id}/`
Report details.

#### `POST /api/reports/generate/`
Generate a new report.
```json
{
  "title": "Weekly Incident Report",
  "report_type": "Weekly",
  "date_range_start": "2026-06-28",
  "date_range_end": "2026-07-05"
}
```

#### `GET /api/reports/{id}/download-pdf/`
Download PDF (streams file).

#### `GET /api/reports/{id}/download-excel/`
Download Excel file.

#### `POST /api/reports/{id}/approve/`
Approve report (Admin only).

---

### Analytics

All analytics endpoints accept optional `start_date` and `end_date` query params.

#### `GET /api/analytics/incident-summary/`
Counts grouped by type, severity, and status.

#### `GET /api/analytics/high-risk-locations/`
Top 10 cameras by incident count.

#### `GET /api/analytics/peak-hours/`
Incident frequency by hour of day (0–23).

#### `GET /api/analytics/response-times/`
Average response time (in minutes) by incident type.

#### `GET /api/analytics/severity-distribution/`
Count of incidents by severity level.

#### `GET /api/analytics/trend-analysis/`
Daily incident counts. Returns array of `{ date, count }`.

#### `GET /api/analytics/heatmap-data/`
Geo-located incidents with lat/lng and weight for heatmap rendering.

---

## AI Service Endpoints

All require `X-API-Key: ai-service-key` header (except `/health`).

#### `GET /health`
Health check.
```json
{ "status": "healthy", "service": "ai-detection-service" }
```

#### `POST /cameras/register`
Register a camera for AI processing.
```json
{
  "id": 1,
  "rtsp_url": "rtsp://192.168.1.100:554/stream1",
  "stream_type": "RTSP",
  "name": "Main Entrance"
}
```

#### `POST /cameras/{id}/deregister`
Remove camera from AI processing. Stops stream consumption.

#### `GET /cameras`
List all cameras registered with the AI service.

#### `GET /cameras/{id}/frame`
Get the latest frame from a camera as a JPEG image.

#### `GET /cameras/{id}/detect`
Run detection on the latest frame from a camera.
```json
{
  "detections": [
    {
      "class": "fire",
      "confidence": 0.92,
      "bbox": [100, 200, 300, 400]
    }
  ],
  "fps": 15.2,
  "frame_width": 640,
  "frame_height": 480
}
```

#### `POST /detect/frame`
Run detection on an uploaded image file (multipart form).
```json
{
  "file": "<image file>",
  "camera_id": 1
}
```

#### `POST /incidents/create`
Create an incident from detection data.

#### `POST /recommendations/generate`
Generate recommendations for an incident.
```json
{
  "incident_type": "Fire",
  "severity": "Critical",
  "confidence_score": 0.95,
  "duration": 60,
  "crowd_size": 20,
  "location_lat": 14.5995,
  "location_lng": 120.9842
}
```
Returns array of recommendations sorted by priority.

#### `GET /stream/{id}/video`
MJPEG video stream from a registered camera. Suitable for `<img>` tags.

#### `GET /config`
Get current AI configuration (confidence thresholds, etc.).

#### `POST /config`
Update AI configuration.
```json
{
  "confidence_thresholds": {
    "fire": 0.6,
    "smoke": 0.5,
    "accident": 0.7
  }
}
```
