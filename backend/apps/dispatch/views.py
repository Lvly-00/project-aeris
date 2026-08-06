import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import CanDispatch
from .filters import DispatchFilter
from .models import Dispatcher, Dispatch, IncidentTimeline
from .serializers import (
    DispatcherSerializer,
    DispatchSerializer,
    DispatchStatusSerializer,
    IncidentTimelineSerializer,
)

logger = logging.getLogger(__name__)


def broadcast_dispatch(action_type, dispatch_data):
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "incidents",
            {"type": "dispatch_update", "action": action_type, "payload": dispatch_data},
        )
    except Exception as e:
        logger.warning("Failed to broadcast dispatch: %s", e)


class DispatcherViewSet(viewsets.ModelViewSet):
    queryset = Dispatcher.objects.select_related("user", "zone").all()
    permission_classes = [IsAuthenticated]
    serializer_class = DispatcherSerializer
    search_fields = ["user__username", "user__first_name", "user__last_name", "phone_number"]
    filterset_fields = ["dispatcher_type", "status", "zone", "is_active"]

    def perform_create(self, serializer):
        serializer.save()


class DispatchViewSet(viewsets.ModelViewSet):
    queryset = Dispatch.objects.select_related(
        "incident", "dispatcher", "dispatched_by"
    ).all()
    permission_classes = [IsAuthenticated]
    serializer_class = DispatchSerializer
    filterset_class = DispatchFilter

    def perform_create(self, serializer):
        dispatch = serializer.save(dispatched_by=self.request.user)
        incident = dispatch.incident
        if incident.status == "Verified":
            incident.status = "Dispatched"
            incident.save()
        IncidentTimeline.objects.create(
            incident=incident,
            event_type=IncidentTimeline.EventType.DISPATCHED,
            title=f"Dispatched {dispatch.dispatcher}",
            description=dispatch.notes,
            actor=self.request.user,
            metadata={
                "dispatcher_id": dispatch.dispatcher_id,
                "dispatch_id": dispatch.id,
            },
        )
        broadcast_dispatch("created", DispatchSerializer(dispatch, context={"request": self.request}).data)

    @action(detail=False, methods=["get"], url_path="my")
    def my_dispatches(self, request):
        user = request.user
        dispatcher = Dispatcher.objects.filter(user=user).first()
        if not dispatcher:
            return Response({"results": [], "count": 0})
        qs = self.get_queryset().filter(dispatcher=dispatcher)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None) -> Response:
        dispatch = self.get_object()
        serializer = DispatchStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")
        now = timezone.now()

        status_fields = {
            Dispatch.Status.ACCEPTED: "accepted_at",
            Dispatch.Status.EN_ROUTE: "en_route_at",
            Dispatch.Status.ON_SCENE: "on_scene_at",
            Dispatch.Status.COMPLETED: "completed_at",
        }

        with transaction.atomic():
            setattr(dispatch, "status", new_status)
            if new_status in status_fields:
                setattr(dispatch, status_fields[new_status], now)

            if notes:
                dispatch.notes = (dispatch.notes + "\n" + notes).strip()
            dispatch.save()

            action_notes = notes or f"Status changed to {new_status}"
            event_map = {
                Dispatch.Status.ACCEPTED: IncidentTimeline.EventType.DISPATCH_ACCEPTED,
                Dispatch.Status.EN_ROUTE: IncidentTimeline.EventType.DISPATCH_EN_ROUTE,
                Dispatch.Status.ON_SCENE: IncidentTimeline.EventType.DISPATCH_ON_SCENE,
                Dispatch.Status.COMPLETED: IncidentTimeline.EventType.DISPATCH_COMPLETED,
            }
            event_type = event_map.get(new_status, IncidentTimeline.EventType.NOTE_ADDED)
            event_title = {
                Dispatch.Status.ACCEPTED: f"Dispatch accepted by {dispatch.dispatcher}",
                Dispatch.Status.EN_ROUTE: f"{dispatch.dispatcher} is en route",
                Dispatch.Status.ON_SCENE: f"{dispatch.dispatcher} arrived on scene",
                Dispatch.Status.COMPLETED: f"{dispatch.dispatcher} completed",
            }.get(new_status, f"Dispatch status: {new_status}")

            IncidentTimeline.objects.create(
                incident=dispatch.incident,
                event_type=event_type,
                title=event_title,
                description=action_notes,
                actor=request.user,
                metadata={
                    "dispatcher_id": dispatch.dispatcher_id,
                    "dispatch_id": dispatch.id,
                    "new_status": new_status,
                },
            )

            if request.user.role == "Dispatcher" and new_status == Dispatch.Status.ACCEPTED:
                dispatch.dispatcher.status = Dispatcher.Status.EN_ROUTE
                dispatch.dispatcher.save()

        result = DispatchSerializer(dispatch, context={"request": request}).data
        broadcast_dispatch("status_update", result)
        return Response(result)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None) -> Response:
        dispatch = self.get_object()
        dispatch.status = Dispatch.Status.CANCELLED
        dispatch.save()
        IncidentTimeline.objects.create(
            incident=dispatch.incident,
            event_type=IncidentTimeline.EventType.NOTE_ADDED,
            title=f"Dispatch cancelled for {dispatch.dispatcher}",
            description=request.data.get("notes", ""),
            actor=request.user,
        )
        result = DispatchSerializer(dispatch, context={"request": request}).data
        broadcast_dispatch("cancelled", result)
        return Response(result)


class IncidentTimelineViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = IncidentTimelineSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = IncidentTimeline.objects.select_related("actor").all()
        incident_id = self.request.query_params.get("incident")
        if incident_id:
            qs = qs.filter(incident_id=incident_id)
        return qs
