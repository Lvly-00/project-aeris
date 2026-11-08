"""
Django-side proxy for the AI service.

Extracted from config/urls/main.py: URL wiring and the proxy itself are two
different jobs, and this module owns the second one. nginx performs the same
job in Docker deployments; this path exists for desktop mode, where Django is
the only HTTP server the Electron shell can reach.
"""
import logging
import os
import re
import threading
import time

import requests as http_requests
from django.http import HttpResponse, StreamingHttpResponse

logger = logging.getLogger(__name__)

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8005")

# Headers the proxy is allowed to forward to the AI service.
# Authorization is intentionally excluded — the AI service authenticates
# via its own X-API-Key, never the user's JWT.
_PROXY_FORWARD_HEADERS = frozenset(["content-type", "x-api-key", "accept"])

_registered_cameras: set = set()
_register_lock = threading.Lock()


def _ensure_camera_registered(camera_id: int) -> bool:
    """Auto-register a camera with the AI service (non-blocking thread)."""
    with _register_lock:
        if camera_id in _registered_cameras:
            return True

    def _do_register():
        try:
            from apps.cameras.models import Camera

            cam = Camera.objects.filter(id=camera_id, is_active=True).first()
            if not cam or not cam.stream_url:
                with _register_lock:
                    _registered_cameras.add(camera_id)
                return
            resp = http_requests.post(
                f"{AI_SERVICE_URL}/cameras/register",
                json={
                    "camera_id": camera_id,
                    "source": cam.stream_url,
                    "stream_type": cam.stream_type,
                },
                headers={"X-API-Key": os.environ.get("AI_SERVICE_API_KEY", "")},
                timeout=3,
            )
            if resp.status_code == 200:
                with _register_lock:
                    _registered_cameras.add(camera_id)
                logger.info(
                    "Auto-registered camera %d (%s) with AI service",
                    camera_id,
                    cam.stream_type,
                )
            else:
                logger.warning(
                    "Camera %d AI registration returned %d", camera_id, resp.status_code
                )
        except Exception as exc:
            logger.warning("Failed to auto-register camera %d: %s", camera_id, exc)

    threading.Thread(target=_do_register, daemon=True).start()
    return False


def ai_proxy(request, path=""):
    """
    Proxy /ai/ requests to the AI service.

    Security:
    - Forwards only an explicit allowlist of headers — never Authorization.
    - The AI service authenticates via X-API-Key, injected here from the
      server-side environment so the browser never holds it.
    - Hard timeout of 30 s; 503 after 3 retries.
    - Request body is capped by nginx (50 MB) and Django's upload limits.
    """
    frame_match = re.match(r"cameras/(\d+)/frame", path)
    detect_match = re.match(r"cameras/(\d+)/detect", path)
    if frame_match or detect_match:
        camera_id = int((frame_match or detect_match).group(1))
        _ensure_camera_registered(camera_id)

    # Silently absorb deregister calls routed through the proxy
    if re.match(r"cameras/(\d+)/deregister", path) and request.method == "POST":
        return HttpResponse('{"status":"ignored"}', content_type="application/json")

    target_url = f"{AI_SERVICE_URL}/{path}"
    params = request.GET.copy()

    forward_headers = {}
    for key, value in request.headers.items():
        if key.lower() in _PROXY_FORWARD_HEADERS:
            forward_headers[key] = value

    ai_key = os.environ.get("AI_SERVICE_API_KEY", "")
    if ai_key:
        forward_headers["X-API-Key"] = ai_key

    is_multipart = request.content_type and "multipart/form-data" in request.content_type
    if is_multipart and request.method == "POST":
        body_data = {k: request.POST[k] for k in request.POST}
        body_files = {
            k: (f.name, f.read(), f.content_type) for k, f in request.FILES.items()
        }
    else:
        body_data = request.body or None
        body_files = None
        if request.content_type:
            forward_headers["Content-Type"] = request.content_type

    last_error = None
    for attempt in range(3):
        try:
            resp = http_requests.request(
                request.method,
                target_url,
                params=params,
                data=body_data,
                files=body_files or None,
                headers=forward_headers,
                stream=True,
                timeout=30,
            )
            excluded = {
                "content-encoding",
                "transfer-encoding",
                "content-length",
                "connection",
            }
            resp_headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}
            content_type = resp.headers.get("content-type", "").lower()
            is_streaming = any(
                t in content_type
                for t in (
                    "video/",
                    "octet-stream",
                    "multipart/x-mixed-replace",
                    "image/jpeg",
                    "image/png",
                )
            )
            if is_streaming:
                django_resp = StreamingHttpResponse(
                    streaming_content=resp.iter_content(chunk_size=8192),
                    status=resp.status_code,
                    content_type=content_type,
                )
            else:
                django_resp = HttpResponse(content=resp.content, status=resp.status_code)
            for k, v in resp_headers.items():
                django_resp[k] = v
            return django_resp
        except http_requests.exceptions.ConnectionError:
            last_error = "ConnectionError"
        except http_requests.exceptions.Timeout:
            last_error = "Timeout"
        except http_requests.exceptions.RequestException:
            last_error = "RequestException"
            break
        if attempt < 2:
            time.sleep(1)

    return HttpResponse(f"AI service unavailable ({last_error})", status=503)
