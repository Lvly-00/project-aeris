import os
import re
import mimetypes
import logging
from pathlib import Path
from typing import List
from wsgiref.util import FileWrapper
from datetime import datetime
from django.conf import settings
from django.http import FileResponse, HttpResponse, StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken
from apps.lookups.models import CameraStatus
from apps.audit.models import AuditLog
from apps.audit.services import write_audit
from apps.incidents.views import broadcast_camera_changed, broadcast_stats_changed
from .models import Camera
from .serializers import CameraSerializer, CameraStatusSerializer


def _is_subpath(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


# Directories searched for a bare MP4 filename. The "Locate File" button in the
# camera form can only store file.name (browsers never expose a real path), so
# "smoke_1.mp4" arrives with no directory at all. Look in the obvious places
# before giving up — no recursive walk, which would be slow and unpredictable.
_VIDEO_SEARCH_DIRS = ("", "sample videos", "videos", "mp4", "media/videos")


def _resolve_video_path(raw: str) -> Path:
    """Resolve a stored stream_url to a concrete file path.

    Absolute paths are used as-is. Anything else is tried against BASE_DIR,
    MEDIA_ROOT and the project root, plus a few well-known media subfolders.
    The caller still enforces the allowed-subpath check, so widening the search
    here cannot expose a file outside the project.
    """
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate.resolve()

    base = Path(settings.BASE_DIR).resolve()
    roots = [base, Path(settings.MEDIA_ROOT).resolve(), base.parent]
    tried: List[Path] = []

    for root in roots:
        for sub in _VIDEO_SEARCH_DIRS:
            tried.append((root / sub / candidate).resolve() if sub else (root / candidate).resolve())

    for path in tried:
        if path.is_file():
            return path

    # Nothing matched — return the primary interpretation so the 404 message
    # shows the path that was actually looked for.
    return (base / candidate).resolve()

logger = logging.getLogger(__name__)


class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.select_related("status").all()
    serializer_class = CameraSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "location_name", "stream_url"]
    ordering_fields = ["name", "status", "last_seen", "created_at"]

    def perform_create(self, serializer):
        camera = serializer.save(status=CameraStatus.objects.get(name="Online"))
        write_audit(
            self.request,
            AuditLog.Action.CAMERA_CREATED,
            user=self.request.user,
            resource_type="Camera",
            resource_id=camera.pk,
            details={"name": camera.name, "location": camera.location_name},
        )
        # The dashboard counts cameras, and a client that just created one
        # would otherwise keep showing the old tile until its next poll.
        broadcast_stats_changed()
        broadcast_camera_changed(camera, "created")
        return camera

    def perform_update(self, serializer):
        camera = serializer.save()
        write_audit(
            self.request,
            AuditLog.Action.CAMERA_UPDATED,
            user=self.request.user,
            resource_type="Camera",
            resource_id=camera.pk,
            details={"name": camera.name, "location": camera.location_name},
        )
        broadcast_stats_changed()
        # The Incidents page prints this camera's name and location on every
        # one of its cards, so a rename has to reach other clients too.
        broadcast_camera_changed(camera, "updated")
        return camera

    def perform_destroy(self, instance):
        # Incidents, detections, timeline and notifications go with it:
        # Incident.camera cascades.
        camera_id = instance.pk
        camera_name = instance.name
        instance.delete()
        write_audit(
            self.request,
            AuditLog.Action.CAMERA_DELETED,
            user=self.request.user,
            resource_type="Camera",
            resource_id=camera_id,
            details={"name": camera_name},
        )
        broadcast_stats_changed()
        broadcast_camera_changed(instance, "deleted")

    @action(detail=False, methods=["delete"], url_path="bulk-destroy")
    def bulk_destroy(self, request) -> Response:
        """Delete many cameras in one call, used by the grid's mass delete."""
        raw_ids = request.data.get("camera_ids")
        if not isinstance(raw_ids, list) or not raw_ids:
            return Response(
                {"error": "camera_ids must be a non-empty list"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            camera_ids = [int(pk) for pk in raw_ids]
        except (TypeError, ValueError):
            return Response(
                {"error": "camera_ids must contain only integers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cameras = list(self.get_queryset().filter(id__in=camera_ids))
        if not cameras:
            return Response(
                {"error": "No cameras matched the given ids"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # One query for the cascade, then one message per camera so other
        # clients drop each of them, exactly like a single delete would.
        Camera.objects.filter(id__in=[c.id for c in cameras]).delete()
        write_audit(
            request,
            AuditLog.Action.CAMERA_DELETED,
            user=request.user,
            resource_type="Camera",
            details={
                "camera_ids": [c.id for c in cameras],
                "names": [c.name for c in cameras],
                "count": len(cameras),
            },
        )
        broadcast_stats_changed()
        for camera in cameras:
            broadcast_camera_changed(camera, "deleted")

        deleted = [c.id for c in cameras]
        logger.info("Bulk deleted cameras: %s", deleted)
        return Response({"deleted": deleted, "count": len(deleted)}, status=status.HTTP_200_OK)


    @action(detail=True, methods=["patch"], url_path="status")
    def status_update(self, request, pk=None) -> Response:
        camera = self.get_object()
        serializer = CameraStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        camera.status, _ = CameraStatus.objects.get_or_create(
            name=serializer.validated_data["status"]
        )
        if "last_seen" in serializer.validated_data:
            camera.last_seen = serializer.validated_data["last_seen"]
        else:
            camera.last_seen = datetime.now()
        camera.save()
        write_audit(
            request,
            AuditLog.Action.CAMERA_UPDATED,
            user=request.user,
            resource_type="Camera",
            resource_id=camera.pk,
            details={"name": camera.name, "status": camera.status.name},
        )
        logger.info("Camera %s status updated to %s", camera.name, camera.status.name)
        return Response(CameraSerializer(camera).data)

    @action(detail=True, methods=["post"], url_path="snapshot")
    def snapshot(self, request, pk=None) -> Response:
        camera = self.get_object()
        if "image" not in request.FILES:
            return Response(
                {"error": "No image file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        image = request.FILES["image"]
        if image.size > 10 * 1024 * 1024:
            return Response({"error": "File too large (max 10MB)"}, status=400)
        if not image.content_type or not image.content_type.startswith("image/"):
            return Response({"error": "Only image files allowed"}, status=400)
        snapshots_dir = settings.MEDIA_ROOT / "snapshots"
        os.makedirs(snapshots_dir, exist_ok=True)
        filename = f"camera_{camera.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = snapshots_dir / filename
        with open(filepath, "wb+") as f:
            for chunk in image.chunks():
                f.write(chunk)
        logger.info("Snapshot saved for camera %s: %s", camera.name, filename)
        return Response(
            {"snapshot_url": f"{settings.MEDIA_URL}snapshots/{filename}"},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="stream", permission_classes=[AllowAny])
    def stream(self, request, pk=None) -> HttpResponse:
        camera = self.get_object()
        if camera.stream_type != Camera.StreamType.MP4:
            return Response({"error": "Stream endpoint only supports MP4 files"}, status=400)

        desktop_mode = getattr(settings, "DESKTOP_MODE", False)
        if not desktop_mode:
            user = None
            jwt_auth = JWTAuthentication()
            try:
                user, _ = jwt_auth.authenticate(request)
            except Exception:
                token = request.query_params.get("token")
                if token:
                    try:
                        validated = AccessToken(token)
                        from django.contrib.auth import get_user_model
                        user = get_user_model().objects.get(id=validated["user_id"])
                    except Exception:
                        pass
            if not user or not user.is_authenticated:
                return Response({"detail": "Authentication required"}, status=401)
        filepath = _resolve_video_path(camera.stream_url)
        if not desktop_mode:
            allowed = [
                Path(settings.MEDIA_ROOT).resolve(),
                Path(settings.BASE_DIR).resolve(),
                Path(settings.BASE_DIR).resolve().parent,
            ]
            if not any(_is_subpath(filepath, base) for base in allowed):
                return Response({"error": "Access denied"}, status=403)
        if not filepath.exists() or not filepath.is_file():
            return Response(
                {"error": f"Video file not found: {camera.stream_url}"},
                status=status.HTTP_404_NOT_FOUND,
            )
        content_type, _ = mimetypes.guess_type(str(filepath))
        content_length = filepath.stat().st_size
        range_header = request.META.get("HTTP_RANGE", "").strip()
        match = re.match(r"bytes=(\d+)-(\d*)", range_header) if range_header else None
        if match:
            start = int(match.group(1))
            end_str = match.group(2)
            end = int(end_str) if end_str else content_length - 1
            if start >= content_length or end >= content_length:
                resp = HttpResponse(status=416, content_type="text/plain")
                resp["Content-Range"] = f"bytes */{content_length}"
                return resp
            length = end - start + 1
            f = open(filepath, "rb")
            f.seek(start)
            response = StreamingHttpResponse(
                streaming_content=_file_iterator(f, length),
                status=206,
                content_type=content_type or "video/mp4",
            )
            response["Content-Range"] = f"bytes {start}-{end}/{content_length}"
            response["Content-Length"] = length
        else:
            f = open(filepath, "rb")
            response = FileResponse(
                f,
                content_type=content_type or "video/mp4",
                as_attachment=False,
                filename=filepath.name,
            )
            response["Content-Length"] = content_length
        response["Accept-Ranges"] = "bytes"
        return response


def _file_iterator(f, length, chunk_size=8192):
    """Yield chunks from an open file, reading at most `length` bytes."""
    remaining = length
    try:
        while remaining > 0:
            chunk = f.read(min(chunk_size, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk
    finally:
        f.close()
