"""
Internal endpoints — service-to-service only (brief §5.4).

Two layers of protection:
  1. nginx restricts /internal/ to the Docker internal subnet (see nginx/default.conf).
     Requests from outside the Docker network never reach Django at all.
  2. InternalAPIKeyPermission rejects requests that lack the correct X-Internal-Key
     header, so a misconfigured proxy or accidental exposure is still rejected at
     the Django layer.
  3. InternalScopedThrottle limits the AI service to 300 req/min so a misbehaving
     or compromised AI container cannot hammer the backend indefinitely.

Do NOT add user-facing endpoints here.
"""
import logging
from django.conf import settings
from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


# ── Permission ────────────────────────────────────────────────────────────────

class InternalAPIKeyPermission(BasePermission):
    """
    Shared-secret check for service-to-service endpoints.

    Reads INTERNAL_API_KEY from settings (sourced from the env).
    In DEBUG mode with an unconfigured key the check is bypassed so local
    development works without extra setup.  In production, an empty key fails
    closed — the endpoint becomes unreachable rather than open.
    """

    message = "Invalid or missing X-Internal-Key."

    def has_permission(self, request, view) -> bool:
        expected: str = getattr(settings, "INTERNAL_API_KEY", "")

        if not expected:
            if getattr(settings, "DEBUG", False):
                # Development: no key configured → allow through
                return True
            # Production: unconfigured key → deny, log the misconfiguration
            logger.error(
                "INTERNAL_API_KEY is not set on this server. "
                "All /internal/ requests will be rejected."
            )
            return False

        provided = request.headers.get("X-Internal-Key", "")
        if provided != expected:
            logger.warning(
                "Internal endpoint rejected bad X-Internal-Key from %s",
                request.META.get("REMOTE_ADDR", "unknown"),
            )
            return False

        return True


# ── Throttle ──────────────────────────────────────────────────────────────────

class InternalScopedThrottle(ScopedRateThrottle):
    """
    Rate-limits the internal endpoint at the 'internal' scope.
    The rate is configured in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']:
        "internal": "300/minute"
    """
    scope = "internal"


# ── View ──────────────────────────────────────────────────────────────────────

class CameraInfoView(APIView):
    """
    Return minimal camera config for the AI service to self-register.

    Called by CameraManager.try_auto_register() inside the AI service.
    Response shape: {id, stream_url, stream_type, is_active}
    """

    authentication_classes = []          # no JWT — AI service doesn't have a user token
    permission_classes = [InternalAPIKeyPermission]
    throttle_classes = [InternalScopedThrottle]
    http_method_names = ["get"]          # read-only; no writes on this endpoint

    def get(self, request, camera_id: int):
        try:
            from apps.cameras.models import Camera
            cam = (
                Camera.objects
                .filter(id=camera_id)
                .values("id", "stream_url", "stream_type", "is_active")
                .first()
            )
        except Exception:
            logger.exception("DB error in CameraInfoView for camera %d", camera_id)
            return Response({"error": "Internal server error"}, status=500)

        if not cam:
            return Response({"error": "Camera not found"}, status=404)

        return Response(cam)


# ── URL patterns — mounted at /internal/ by config/urls/main.py ───────────────

urlpatterns = [
    path("cameras/<int:camera_id>/", CameraInfoView.as_view(), name="internal-camera-info"),
]
