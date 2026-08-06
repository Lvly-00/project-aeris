import logging
import django.db.models as models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer, NotificationMarkReadSerializer

logger = logging.getLogger(__name__)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_read", "notification_type", "priority"]

    def get_queryset(self):
        qs = Notification.objects.select_related("incident").all()
        user = self.request.user
        qs = qs.filter(
            models.Q(recipient=user) | models.Q(recipient__isnull=True)
        )
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        return qs

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request) -> Response:
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        qs = self.get_queryset()
        if serializer.validated_data.get("all"):
            count = qs.filter(is_read=False).update(is_read=True)
        else:
            ids = serializer.validated_data.get("ids", [])
            count = qs.filter(id__in=ids, is_read=False).update(is_read=True)
        logger.info("Marked %d notifications as read for user %s", count, request.user.username)
        return Response({"marked_read": count})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request) -> Response:
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        logger.info(
            "Marked all %d notifications as read for user %s",
            count, request.user.username,
        )
        return Response({"marked_read": count})

    @action(detail=False, methods=["get"], url_path="unread_count")
    def unread_count(self, request) -> Response:
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read_single(self, request, pk=None) -> Response:
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)


