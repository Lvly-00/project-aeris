import os
import re
import mimetypes
import logging
from pathlib import Path
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
from .models import Camera
from .serializers import CameraSerializer, CameraStatusSerializer


def _is_subpath(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False

logger = logging.getLogger(__name__)


class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.select_related("status").all()
    serializer_class = CameraSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "location_name", "stream_url"]
    ordering_fields = ["name", "status", "last_seen", "created_at"]

    def perform_create(self, serializer):
        serializer.save(status=CameraStatus.objects.get(name="Online"))

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

        if not settings.DESKTOP_MODE:
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
        filepath = Path(camera.stream_url)
        if not filepath.is_absolute():
            filepath = Path(settings.BASE_DIR) / filepath
        filepath = filepath.resolve()
        if not settings.DESKTOP_MODE:
            allowed = [
                Path(settings.MEDIA_ROOT).resolve(),
                Path(settings.BASE_DIR).resolve(),
                Path(settings.BASE_DIR).resolve().parent,
            ]
            if not any(_is_subpath(filepath, base) for base in allowed):
                return Response({"error": "Access denied"}, status=403)
        if not filepath.exists() or not filepath.is_file():
            return Response(
                {"error": f"Video file not found: {filepath}"},
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
