import logging
from django.utils import timezone
from django.db.models import Q
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import User
from .models import DispatchMessage, IncidentTimeline
from .serializers import (
    DispatchMessageSerializer,
    IncidentTimelineSerializer,
)

logger = logging.getLogger(__name__)


def broadcast_message(message):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "incidents",
            {"type": "message_new", "payload": DispatchMessageSerializer(message).data},
        )
    except Exception as e:
        logger.warning("Failed to broadcast dispatch message: %s", e)


class IncidentTimelineViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = IncidentTimelineSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = IncidentTimeline.objects.select_related("actor").all()
        incident_id = self.request.query_params.get("incident")
        if incident_id:
            qs = qs.filter(incident_id=incident_id)
        return qs


class DispatchMessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DispatchMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DispatchMessage.objects.select_related(
            "incident",
            "incident__camera",
            "dispatched_by",
            "recipient",
        ).order_by("-created_at")
        user = self.request.user
        if user.is_tanod():
            qs = qs.filter(Q(recipient__isnull=True) | Q(recipient=user))
        return qs

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None) -> Response:
        message = self.get_object()
        message.is_read = True
        message.read_at = timezone.now()
        message.save()
        return Response(self.get_serializer(message).data)
