"""
Root URL configuration.

ROOT_URLCONF = "config.urls" resolves to config/urls/__init__.py which
re-exports urlpatterns from this file. This module only wires URLs; the AI
proxy lives in config/views/ai_proxy.py and the service-to-service endpoints
in config/urls/internal.py.

  /admin/          Django admin
  /api/            API v1 (see api_v1.py)
  /internal/       Service-to-service endpoints — network-restricted
  /ai/             Proxy to AI service (desktop mode only; nginx in Docker)
  /media/, /static/ Static/media assets (desktop mode)
  /                Frontend SPA (desktop mode only)
"""
import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.decorators.csrf import csrf_exempt
from django.views.static import serve

from config.views.ai_proxy import ai_proxy

urlpatterns = [
    path("admin/", admin.site.urls),
    # Internal service-to-service endpoints (network-restricted + key-checked)
    path("internal/", include("config.urls.internal")),
    # All public API endpoints
    path("api/", include("config.urls.api_v1")),
]

# Media files in DEBUG mode (development only)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Desktop mode — Django serves the SPA and proxies AI requests locally
if getattr(settings, "DESKTOP_MODE", False):
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]
    frontend_dir = getattr(settings, "FRONTEND_DIST_DIR", None)
    if frontend_dir and os.path.exists(os.path.join(frontend_dir, "index.html")):

        def serve_frontend(request, path=""):
            file_path = os.path.join(frontend_dir, path)
            if path and os.path.exists(file_path) and os.path.isfile(file_path):
                return serve(request, path, document_root=frontend_dir)
            return serve(request, "index.html", document_root=frontend_dir)

        # AI proxy must precede the SPA catch-all
        urlpatterns.insert(0, re_path(r"^ai/(?P<path>.*)$", csrf_exempt(ai_proxy)))
        urlpatterns.insert(
            1,
            re_path(r"^(?!api/|admin/|media/|static/|internal/)(?P<path>.*)$", serve_frontend),
        )


def handler404(request, exception=None):
    return JsonResponse({"error": "Not found"}, status=404)


def handler500(request):
    return JsonResponse({"error": "Internal server error"}, status=500)
