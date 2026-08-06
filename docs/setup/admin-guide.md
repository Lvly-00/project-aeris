# Admin Guide

This guide covers administration tasks: user management, system configuration, maintenance, and security.

## User Management

### Roles and Permissions

| Permission | Viewer | Operator | Admin |
|-----------|--------|----------|-------|
| View dashboard | ✓ | ✓ | ✓ |
| View analytics | ✓ | ✓ | ✓ |
| View GIS map | ✓ | ✓ | ✓ |
| View incidents | Read-only | ✓ | ✓ |
| View cameras | Read-only | ✓ | ✓ |
| Manage cameras | — | ✓ | ✓ |
| Review/recommend | — | ✓ | ✓ |
| Accept/reject recommendations | — | ✓ | ✓ |
| Generate reports | — | ✓ | ✓ |
| Manage users | — | — | ✓ |
| Manage zones | — | — | ✓ |
| Delete data | — | — | ✓ |

### Creating Users

Via the Django admin interface:
1. Go to `http://localhost/admin/`
2. Log in as a superuser
3. Navigate to **Accounts > Users**
4. Click **Add User**
5. Fill in username, password, and set role

Via API:
```bash
curl -X POST http://localhost:8000/api/accounts/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_operator",
    "password": "SecurePass123!",
    "password2": "SecurePass123!",
    "role": "Operator"
  }'
```

### Managing Users

Admins can:
- **View** all users and their roles
- **Edit** user profiles and roles
- **Deactivate** users (set `is_active = False`)
- **Delete** users (removes all associated data)

## AI Detection Configuration

### Confidence Thresholds

Per-type confidence thresholds control how sensitive the AI detection is:

| Incident Type | Default Threshold | Recommended Setting |
|--------------|------------------|-------------------|
| Fire | 0.50 | 0.60 (lower false positives) |
| Smoke | 0.50 | 0.55 |
| Traffic Accident | 0.55 | 0.60 |
| Crowd Formation | 0.50 | 0.55 |
| Flood | 0.50 | 0.50 |
| Road Obstruction | 0.55 | 0.60 |
| Illegal Dumping | 0.55 | 0.65 |
| Abandoned Object | 0.55 | 0.60 |

- **Lower thresholds** = more detections (but more false positives)
- **Higher thresholds** = fewer false positives (but may miss real incidents)

Adjust via:
```bash
curl -X POST http://localhost:8005/config \
  -H "X-API-Key: ai-service-key" \
  -H "Content-Type: application/json" \
  -d '{
    "confidence_thresholds": {
      "fire": 0.65,
      "smoke": 0.60
    }
  }'
```

### Temporal Dedup Window

Confidence filter uses a 5-second temporal dedup window. If the same detection type appears within 5 seconds of the last detection, it is suppressed. This prevents duplicate incident creation.

### Adjusting HSV Thresholds

For fire/smoke/water detection (used in `fire_detector.py`), you can adjust HSV ranges:

```python
# fire_detector.py
FIRE_LOWER = (0, 100, 100)
FIRE_UPPER = (10, 255, 255)
SMOKE_LOWER = (0, 0, 150)    # V lower bound — increase to reduce false positives
SMOKE_UPPER = (180, 30, 255) # S upper bound — decrease to reduce false positives
```

## Incident Dedup

When the AI service detects an incident, the backend checks if an incident of the same type from the same camera was created within the last **10 minutes**. If so, the existing incident is returned instead of creating a duplicate.

**Excluded from dedup**: Dismissed incidents. If an incident was dismissed, a new detection of the same type will create a fresh incident record.

## Health Monitoring

### Checking Service Status

```bash
# Backend
curl http://localhost:8000/api/docs/
# AI Service
curl http://localhost:8005/health
# Frontend
curl http://localhost/
```

### Docker Health Checks

```bash
# Check all running containers
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f frontend

# Check resource usage
docker stats
```

### Database Backups

```bash
# Backup MySQL database
docker-compose exec db mysqldump -u barangay_user -p barangay_cctv > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker-compose exec -T db mysql -u barangay_user -p barangay_cctv
```

## Performance Tuning

### AI Service

| Setting | Default | Notes |
|---------|---------|-------|
| `DEVICE` | `cpu` | Set to `cuda` if GPU available (10-20x faster) |
| Frame rate | 15 FPS | Lower for less CPU usage |
| Resolution | 640×640 | Lower = faster, higher = more accurate |
| Stream reconnect | 5s | Time between reconnect attempts |

### Backend

| Setting | Default | Notes |
|---------|---------|-------|
| Throttle rate (anon) | 100/hr | Adjust in `settings.py` |
| Throttle rate (auth) | 1000/hr | Adjust in `settings.py` |
| Page size | 25 | Adjustable via `?page_size=` |
| Celery workers | 4 | Adjust in `docker-compose.yml` |

### Frontend

| Setting | Default | Notes |
|---------|---------|-------|
| Dashboard refresh | 15s | Adjust in `AppLayout.tsx` |
| Notification poll | 5s | Adjust in `AppLayout.tsx` |
| Camera poll | 10s | Adjust in `CameraMonitoringPage.tsx` |

## Security Hardening

### For Production Deployment

1. **Secret Key**: Generate a strong random key
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(50))"
   ```

2. **HTTPS**: Set up TLS certificates (Let's Encrypt) in Nginx

3. **Database**: Use strong passwords, restrict access to Docker network

4. **API Key**: Change the default `ai-service-key` in `.env` and update both backend and AI service

5. **Debug Mode**: Ensure `DEBUG=False` in production

6. **CORS**: Restrict `CORS_ALLOWED_ORIGINS` to your domain

7. **File Uploads**: The system restricts uploads to image files (max 10MB)

8. **Rate Limiting**: Enabled by default (100 req/hr anonymous, 1000 req/hr authenticated)
