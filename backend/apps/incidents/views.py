import logging
from django.db.models import Count
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import User
from apps.cameras.models import Camera
from apps.dispatch.models import DispatchMessage, IncidentTimeline
from apps.lookups.models import IncidentStatus, IncidentType, NotificationType
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationSerializer
from .filters import IncidentFilter
from .models import Incident
from .serializers import (
    IncidentSerializer,
    IncidentCreateSerializer,
    IncidentListSerializer,
    IncidentStatusUpdateSerializer,
)

logger = logging.getLogger(__name__)

def broadcast_incident(event_type, incident_data):
    """
    event_type: 'incident_created' or 'incident_update'
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "incidents",
            {
                "type": event_type,
                "payload": incident_data,
            },
        )
    except Exception as e:
        logger.error(f"WebSocket Broadcast Failed: {e}")

def broadcast_notification(notification):
    """
    Push a notification to the user it is addressed to. Every notification
    has a recipient, so it is sent to that user's private group
    (user_{id}) — admins and tanods never receive each other's toasts.
    """
    try:
        channel_layer = get_channel_layer()
        recipient_id = getattr(notification, "recipient_id", None)
        group = f"user_{recipient_id}" if recipient_id else "incidents"
        async_to_sync(channel_layer.group_send)(
            group,
            {
                "type": "user_notification_new",
                "payload": NotificationSerializer(notification).data,
            },
        )
    except Exception as e:
        logger.error(f"WebSocket Notification Broadcast Failed: {e}")

def create_incident_notification(incident):
    """
    Create an Alert notification for a detected incident and push it
    in real-time to all connected clients. Notifications are sent per
    admin/operator user (role-specific) so tanods only receive dispatch
    notifications — not the admin's incident alerts.
    """
    priority = (
        "High" if incident.confidence_score >= 0.8 else "Medium"
    )
    alert_type = NotificationType.objects.get(name="Alert")
    type_name = incident.incident_type.name

    for recipient in User.objects.filter(
        role__name__in=["CCTV Chief", "CCTV Operator"]
    ):
        notification = Notification.objects.create(
            incident=incident,
            recipient=recipient,
            title=f"{type_name} Detected",
            message=(
                incident.description
                or f"{type_name} detected"
            ),
            notification_type=alert_type,
            priority=priority,
        )

        broadcast_notification(notification)

    return notification


def incident_location(incident):
    """Human readable location for an incident."""
    if incident.camera and incident.camera.location_name:
        return incident.camera.location_name
    return "Unknown location"


def incident_label(incident):
    return incident.incident_type.name.replace("_", " ")


def create_dispatch_message_and_notifications(incident, user):
    """
    Called when an incident is dispatched:
    - broadcasts a DispatchMessage to all tanods (realtime message inbox)
    - creates dispatch notifications for tanods only (admins keep the
      "Detected" alerts; dispatch notifications are tanod-only)
    """
    location = incident_location(incident)
    incident_no = f"INC-2026-{str(incident.id).zfill(6)}"
    label = incident_label(incident)
    priority = (
        Notification.Priority.HIGH
        if incident.severity in ("High", "Critical")
        else Notification.Priority.MEDIUM
    )
    info_type = NotificationType.objects.get(name="Info")

    # 1) Dispatch message broadcast to all tanods
    message = DispatchMessage.objects.create(
        incident=incident,
        title=f"{label.title()} Dispatch",
        body=(
            f"A {label} incident has been reported at {location} "
            f"(Incident No. {incident_no}). All available Barangay Tanods "
            "are ordered to proceed immediately to the barangay hall for "
            "briefing and to respond to the incident."
        ),
        dispatched_by=user,
        recipient=None,
    )
    from apps.dispatch.views import broadcast_message
    broadcast_message(message)

    # 2) Dispatch notifications — tanod users only
    tanod_users = User.objects.filter(role__name="Barangay Tanod")
    for tanod in tanod_users:
        tanod_notification = Notification.objects.create(
            incident=incident,
            recipient=tanod,
            title=f"New Dispatch: {label.title()}",
            message=(
                f"You have been dispatched to a {label} incident at {location}. "
                "Proceed to the barangay hall for briefing and respond immediately."
            ),
            notification_type=info_type,
            priority=priority,
        )
        broadcast_notification(tanod_notification)


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related(
        "camera", "incident_type", "status",
        "recorded_by", "verified_by", "dismissed_by",
    ).all()
    permission_classes = [IsAuthenticated]
    search_fields = ["incident_type__name", "description", "status__name"]
    filterset_class = IncidentFilter

    def get_serializer_class(self):
        if self.action == "create":
            return IncidentCreateSerializer
        if self.action == "list":
            return IncidentListSerializer
        return IncidentSerializer

    def perform_create(self, serializer):
        incident = serializer.save()

        IncidentTimeline.objects.create(
            incident=incident,
            event_type=IncidentTimeline.EventType.DETECTED,
            title=f"{incident.incident_type.name} detected",
            actor=self.request.user,
        )

        data = IncidentSerializer(
            incident,
            context={"request": self.request},
        ).data

        broadcast_incident(
            "incident_created",
            data,
        )

        create_incident_notification(incident)

    @action(
    detail=False,
    methods=["post"],
    url_path="create-from-detection"
)
    def create_from_detection(self, request) -> Response:
        incident_type = request.data.get("incident_type")
        camera_id = request.data.get("camera_id")
        confidence_score = request.data.get("confidence_score")

        if not incident_type:
            return Response(
                {
                    "error": "incident_type is required"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            type_obj = IncidentType.objects.get(name=incident_type)
        except IncidentType.DoesNotExist:
            return Response(
                {"error": f"Unknown incident_type '{incident_type}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            confidence = float(confidence_score or 0)
        except (TypeError, ValueError):
            return Response(
                {
                    "error": "confidence_score must be a number"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        camera = None
        if camera_id:
            try:
                camera = Camera.objects.get(id=camera_id)
            except Camera.DoesNotExist:
                return Response(
                    {"error": "Camera not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        incident = Incident.objects.create(
            incident_type=type_obj,
            severity="Medium" if confidence < 0.8 else "High",
            status=IncidentStatus.objects.get(name="Detected"),
            camera=camera,
            confidence_score=confidence,
            description=f"AI detected {type_obj.name} from {camera.name if camera else 'simulation'}",
            recorded_by=request.user,
        )

        data = IncidentSerializer(
            incident,
            context={"request": request}
        ).data

        broadcast_incident(
            "incident_created",
            data
        )

        create_incident_notification(incident)

        return Response(
            data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def status_transition(self, request, pk=None) -> Response:
        incident = self.get_object()
        serializer = IncidentStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")
        user = request.user
        now = timezone.now()

        current_status = incident.status.name

        # ENFORCED SIMPLIFIED STATE MACHINE
        allowed_transitions = {
            "Detected": ["Verified", "Dismissed"],
            "Verified": ["Dispatched", "Dismissed"],
            "Dispatched": ["Resolved"],
            "Resolved": [],
            "Dismissed": ["Detected"],
        }

        if new_status not in allowed_transitions.get(current_status, []):
            return Response(
                {"error": f"Cannot transition from {current_status} to {new_status}"},
                status=400
            )

        # Update fields
        incident.status = IncidentStatus.objects.get(name=new_status)
        if new_status == "Verified":
            incident.verified_at = now
            incident.verified_by = user
        elif new_status == "Dispatched":
            incident.dispatched_at = now
        elif new_status == "Resolved":
            incident.resolved_at = now
            if incident.detected_at:
                incident.duration = str(now - incident.detected_at)
        elif new_status == "Dismissed":
            incident.dismissed_at = now
            incident.dismissed_by = user

        incident.save()

        # Notes are recorded as timeline entries (review_notes was removed).
        if notes:
            IncidentTimeline.objects.create(
                incident=incident,
                event_type=IncidentTimeline.EventType.NOTE_ADDED,
                title="Note added",
                description=notes,
                actor=user,
            )

        # Automatically send a dispatch message + role-specific notifications
        # to the tanods when the incident is dispatched by the admin.
        if new_status == "Dispatched":
            create_dispatch_message_and_notifications(incident, user)

        # Timeline entry for the transition itself
        IncidentTimeline.objects.create(
            incident=incident,
            event_type=new_status,
            title=f"Incident marked as {new_status.lower()}",
            actor=user,
        )

        # Broadcast Update to Phone App
        result = IncidentSerializer(
            incident,
            context={"request": request},
        ).data

        broadcast_incident(
            "incident_update",
            result,
        )

        return Response(result)

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request) -> Response:
        base = Incident.objects.all()
        return Response({
            "active_incidents": base.exclude(status__name__in=["Resolved", "Dismissed"]).count(),
            "total_incidents": base.count(),
            "today_incidents": base.filter(detected_at__date=timezone.now().date()).count(),
            "total_cameras": Camera.objects.count(),
            "by_status": base.values("status__name").annotate(count=Count("id")),
            "by_type": base.values("incident_type__name").annotate(count=Count("id")),
        })

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None) -> Response:
        from apps.dispatch.serializers import IncidentTimelineSerializer
        qs = IncidentTimeline.objects.select_related("actor").filter(incident_id=pk).order_by("created_at")
        serializer = IncidentTimelineSerializer(qs, many=True)
        return Response(serializer.data)
