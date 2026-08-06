# Troubleshooting Guide

## Common Issues

### Evidence Images Not Showing

**Symptoms**: Images display as broken icons or return 404.

**Causes and fixes**:

1. **DEBUG=False in Django** (local dev):
   - Create `backend/.env` with `DEBUG=True`
   - Restart the backend server

2. **Nginx not serving media files** (Docker):
   - Check nginx config has `/media/` route to backend
   - Verify media files exist: `docker-compose exec backend ls media/`

3. **Wrong file path**:
   - Check that evidence_image field stores a relative path, not absolute

### Camera Stream "Unavailable"

**Symptoms**: Camera tile shows "Unavailable" or loads indefinitely.

**Causes and fixes**:

1. **Stream type mismatch**:
   - For external webcam pages (SkylineWebcams), use **EMBED** stream type
   - For local video files, use **MP4**
   - For IP cameras, use **RTSP**

2. **Network connectivity**:
   - Can the AI service reach the camera IP?
   - For Docker: ensure network is not isolated
   - Test: `docker-compose exec ai-service curl <rtsp_url>`

3. **Stream manager error**:
   - Check AI service logs: `docker-compose logs ai-service`
   - Common: invalid RTSP URL, stream timeout, codec not supported

4. **Camera not registered with AI**:
   - Cameras must be registered via the AI service before AI detection works
   - The frontend registers cameras when detection is enabled

### AI Detection Not Working

**Symptoms**: No incidents being created despite active cameras.

**Causes and fixes**:

1. **Confidence threshold too high**:
   - Check current thresholds: `curl http://localhost:8005/config`
   - Lower thresholds: `curl -X POST http://localhost:8005/config -H "X-API-Key: ai-service-key" -H "Content-Type: application/json" -d '{"confidence_thresholds": {"fire": 0.4}}'`

2. **Camera not registered**:
   - List registered cameras: `curl http://localhost:8005/cameras -H "X-API-Key: ai-service-key"`
   - Register if missing via the frontend Cameras page

3. **Temporal dedup blocking**:
   - Same detection within 5 seconds is suppressed
   - Wait or adjust in `confidence_filter.py`

4. **YOLO model not loaded**:
   - Check AI service logs for model loading errors
   - Ensure `yolo11n.pt` exists in `ai-service/` directory

5. **GPU/CUDA issues**:
   - If `DEVICE=cuda` but no GPU, fall back to `DEVICE=cpu`

### Recommendations Not Generated

**Symptoms**: Incident created but no recommendations appear.

**Causes and fixes**:

1. **Recommendation engine error**:
   - Check AI service logs for errors
   - Ensure `recommendation_engine.py` is importing correctly

2. **Backend API unreachable**:
   - AI service creates incidents via backend API
   - Verify `BACKEND_API_URL` env var is correct

3. **Missing incident data**:
   - Recommendations need `incident_type`, `severity`, `confidence_score`
   - Ensure all required fields are provided

### Login Issues

**Symptoms**: Cannot log in, or session expires immediately.

**Causes and fixes**:

1. **Wrong credentials**:
   - Use the superuser created via `createsuperuser`
   - Check password case sensitivity

2. **Token expired**:
   - Access tokens last 30 minutes
   - Frontend auto-refreshes, but a manual re-login may be needed

3. **CORS error** (browser console):
   - Frontend at `localhost:5173` must be in `CORS_ALLOWED_ORIGINS`
   - Add it to `backend/.env`: `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost`

### Docker Issues

#### Containers won't start

```bash
# Check logs
docker-compose logs

# Check port conflicts
netstat -ano | findstr :80
netstat -ano | findstr :8000
netstat -ano | findstr :8005
netstat -ano | findstr :3306

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

#### Database connection refused

```bash
# Ensure DB is running
docker-compose ps db

# Check DB logs
docker-compose logs db

# Wait for DB to be ready
docker-compose exec backend python manage.py migrate
```

#### Permission errors on Linux

```bash
# Fix volume permissions
sudo chown -R 1000:1000 backend/media
```

### Performance Issues

**Symptoms**: Slow page loads, delayed detection, video stuttering.

**Causes and fixes**:

1. **Too many cameras**:
   - Each camera uses CPU for stream processing
   - Reduce active cameras or increase hardware

2. **CPU overload**:
   - AI service uses significant CPU for YOLO inference
   - Enable GPU: set `DEVICE=cuda` in AI service config
   - Reduce frame rate in `stream_manager.py`

3. **Database performance**:
   - Large incident tables slow queries
   - Archive old incidents or add database indexes

4. **Memory limits** (Docker):
   - Check `docker stats` for memory usage
   - Increase memory limits in `docker-compose.yml`

### Notification Sounds Not Playing

**Symptoms**: Notifications appear but no sound plays.

**Causes and fixes**:

1. **Browser tab not focused**:
   - Some browsers block audio in background tabs
   - Keep the application tab active

2. **Audio autoplay blocked**:
   - Browser requires user interaction before playing audio
   - Click anywhere on the page first

3. **No speakers/volume**:
   - Check system volume and speaker connection

## Debugging Checklist

If something isn't working, follow these steps:

1. **Check all services are running**
   ```bash
   docker-compose ps
   ```

2. **Check service health**
   ```bash
   curl http://localhost:8005/health
   curl http://localhost:8000/api/docs/
   ```

3. **Check logs**
   ```bash
   docker-compose logs --tail=50 backend
   docker-compose logs --tail=50 ai-service
   docker-compose logs --tail=50 frontend
   ```

4. **Check database**
   ```bash
   docker-compose exec backend python manage.py check
   docker-compose exec backend python manage.py showmigrations
   ```

5. **Check frontend console**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API requests

6. **Clear and restart**
   ```bash
   docker-compose down
   docker-compose up -d
   ```
