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
import json
import logging
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fetch_frame_as_evidence(camera_id: int):
    """
    Pull the latest JPEG frame from the AI service for a camera and return it
    as a Django InMemoryUploadedFile ready to assign to an ImageField.

    Returns None if the AI service is unreachable or returns no frame.
    This is the fallback for when the AI pusher doesn't attach an evidence
    image (e.g. running an older version that hasn't been restarted yet).
    """
    import os
    import io
    import requests as _req
    from django.core.files.uploadedfile import InMemoryUploadedFile

    # AI_SERVICE_URL is defined in config/urls/main.py — import it here to
    # avoid duplicating the default value.
    try:
        from config.urls.main import AI_SERVICE_URL, _PROXY_FORWARD_HEADERS
        ai_url = AI_SERVICE_URL
    except ImportError:
        ai_url = os.environ.get("AI_SERVICE_URL", "http://localhost:8005")

    ai_key = os.environ.get("AI_SERVICE_API_KEY", "")
    # Fall back to INTERNAL_API_KEY if API key not in env (common in dev)
    if not ai_key:
        ai_key = getattr(settings, "INTERNAL_API_KEY", "")

    url = f"{ai_url}/cameras/{camera_id}/frame"
    try:
        resp = _req.get(
            url,
            headers={"X-API-Key": ai_key},
            timeout=3,
        )
        if resp.status_code == 200 and resp.content:
            buf = io.BytesIO(resp.content)
            return InMemoryUploadedFile(
                buf, "evidence_image",
                f"snapshot_{camera_id}.jpg",
                "image/jpeg",
                len(resp.content),
                None,
            )
        logger.debug("Frame fetch for camera %d returned %d", camera_id, resp.status_code)
    except Exception as exc:
        logger.debug("Could not fetch frame for camera %d: %s", camera_id, exc)
    return None


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


# ── View: camera info ─────────────────────────────────────────────────────────

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


# ── View: incident create from AI detection ───────────────────────────────────

class InternalIncidentCreateView(APIView):
    """
    Accept an AI detection hit and create or update an Incident in Django.

    This is the service-to-service counterpart of
    IncidentViewSet.create_from_detection().  It uses the same grouping
    logic but authenticates via X-Internal-Key instead of JWT so the AI
    service does not need a user account.

    Expected POST body (multipart/form-data or application/x-www-form-urlencoded):
        incident_type   str   required  e.g. "Fire"
        camera_id       int   required
        confidence_score float required  0.0–1.0
        bbox            str   optional  JSON array [x1,y1,x2,y2]
        evidence        file  optional  JPEG snapshot
    """

    authentication_classes = []
    permission_classes = [InternalAPIKeyPermission]
    throttle_classes = [InternalScopedThrottle]
    http_method_names = ["post"]

    def post(self, request):
        from apps.cameras.models import Camera
        from apps.incidents.models import Incident
        from apps.lookups.models import IncidentStatus, IncidentType
        from apps.incidents.views import (
            find_open_incident,
            record_detection_hit,
            broadcast_incident,
            create_incident_notification,
            broadcast_stats_changed,
        )
        from apps.incidents.serializers import IncidentSerializer

        incident_type_name = request.data.get("incident_type")
        raw_camera_id = request.data.get("camera_id")
        confidence_score = request.data.get("confidence_score")
        bbox_raw = request.data.get("bbox")
        evidence = request.FILES.get("evidence") or None

        if not incident_type_name:            return Response({"error": "incident_type is required"}, status=400)

        try:
            type_obj = IncidentType.objects.get(name=incident_type_name)
        except IncidentType.DoesNotExist:
            return Response(
                {"error": f"Unknown incident_type '{incident_type_name}'"},
                status=400,
            )

        try:
            confidence = float(confidence_score or 0)
        except (TypeError, ValueError):
            return Response({"error": "confidence_score must be a number"}, status=400)

        camera = None
        if raw_camera_id:
            try:
                camera = Camera.objects.get(id=int(raw_camera_id))
            except (Camera.DoesNotExist, ValueError, TypeError):
                return Response({"error": "Camera not found"}, status=404)

        # If the AI pusher didn't attach a frame (older service version not yet
        # restarted, or fire/smoke detector that runs without a frame), fetch
        # the latest JPEG directly from the AI service as a fallback.
        if evidence is None and raw_camera_id:
            try:
                evidence = _fetch_frame_as_evidence(int(raw_camera_id))
                if evidence:
                    logger.debug(
                        "Fetched fallback frame for camera %s (%.0f KB)",
                        raw_camera_id, evidence.size / 1024,
                    )
            except Exception:
                pass

        with transaction.atomic():
            open_incident = find_open_incident(
                camera, lock=True, incident_type=type_obj
            )

            if open_incident is not None:
                # Group repeat detection into the live incident.
                updates = {"detection_count": F("detection_count") + 1}
                if confidence > open_incident.confidence_score:
                    updates["confidence_score"] = confidence

                Incident.objects.filter(pk=open_incident.pk).update(**updates)
                open_incident.refresh_from_db(fields=list(updates))

                # Backfill evidence_image if this incident was created without
                # one (e.g. the first push had no frame attached).
                if evidence and not open_incident.evidence_image:
                    open_incident.evidence_image = evidence
                    open_incident.save(update_fields=["evidence_image"])

                record_detection_hit(
                    open_incident, type_obj, camera, confidence,
                    evidence, bbox_raw,
                )

                logger.info(
                    "[Internal] Grouped AI detection into incident %s "
                    "(camera=%s, type=%s, count=%s)",
                    open_incident.pk,
                    camera.name if camera else None,
                    incident_type_name,
                    open_incident.detection_count,
                )

                data = IncidentSerializer(
                    open_incident, context={"request": request}
                ).data
                return Response({**data, "grouped": True}, status=200)

            # New incident
            incident = Incident.objects.create(
                incident_type=type_obj,
                severity="High" if confidence >= 0.8 else "Medium",
                status=IncidentStatus.objects.get(name="Detected"),
                camera=camera,
                confidence_score=confidence,
                description=(
                    f"AI detected {type_obj.name} with "
                    f"{confidence:.0%} confidence"
                    + (f" at {camera.location_name}" if camera and camera.location_name else "")
                ),
                recorded_by=None,
                source=Incident.Source.AI,
                evidence_image=evidence,
            )

            record_detection_hit(
                incident, type_obj, camera, confidence, evidence, bbox_raw
            )

        data = IncidentSerializer(incident, context={"request": request}).data

        broadcast_incident("incident_created", data)
        broadcast_stats_changed()
        create_incident_notification(incident)

        logger.info(
            "[Internal] Created new AI incident #%s (type=%s, camera=%s, conf=%.2f)",
            incident.pk, incident_type_name,
            camera.name if camera else None, confidence,
        )

        return Response({**data, "grouped": False}, status=201)


# ── View: active camera list for AI service startup ───────────────────────────

class CameraListView(APIView):
    """
    Return all active cameras so the AI service can register them on startup.

    Response: list of {id, stream_url, stream_type, is_active}
    """

    authentication_classes = []
    permission_classes = [InternalAPIKeyPermission]
    throttle_classes = [InternalScopedThrottle]
    http_method_names = ["get"]

    def get(self, request):
        try:
            from apps.cameras.models import Camera
            cameras = list(
                Camera.objects
                .filter(is_active=True)
                .values("id", "stream_url", "stream_type", "is_active")
            )
        except Exception:
            logger.exception("DB error in CameraListView")
            return Response({"error": "Internal server error"}, status=500)

        return Response(cameras)


# ── URL patterns — mounted at /internal/ by config/urls/main.py ───────────────

urlpatterns = [
    path("cameras/<int:camera_id>/", CameraInfoView.as_view(), name="internal-camera-info"),
    path("cameras/list/", CameraListView.as_view(), name="internal-camera-list"),
    path("incidents/create/", InternalIncidentCreateView.as_view(), name="internal-incident-create"),
]
