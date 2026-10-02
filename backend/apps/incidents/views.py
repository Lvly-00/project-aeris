import json
import logging
from django.db import transaction
from django.db.models import Count, F, Min, Q
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

# A camera is considered "clear" once its incident reaches one of these states.
# An AI detection arriving after that re-arms the camera and alerts again.
CLOSED_INCIDENT_STATUSES = ["Resolved", "Dismissed"]

# Shown in place of a camera name when the camera was deleted out from under
# an incident, which leaves the incident with no camera of its own.
UNASSIGNED_CAMERA_LABEL = "Unassigned"

# How many individual detection hits we retain per incident. A camera keeps
# re-detecting while an incident is live; this bounds both the row count and
# the snapshot storage while keeping `detection_count` as the true total.
MAX_DETECTIONS_PER_INCIDENT = 50


def record_detection_hit(incident, type_obj, camera, confidence, evidence, bbox_raw):
    """
    Persist one AI detection hit against the incident so operators can review
    each re-detection individually and mark it real or a false positive.

    Returns the created Detection, or None when the incident has hit its
    retention cap. Detections without a camera are skipped — Detection.camera
    is required and there is nothing to group them under.
    """
    from apps.detections.models import Detection

    if camera is None:
        return None

    if incident.detections.count() >= MAX_DETECTIONS_PER_INCIDENT:
        return None

    bbox = {}
    if bbox_raw:
        try:
            parsed = json.loads(bbox_raw) if isinstance(bbox_raw, str) else bbox_raw
            if isinstance(parsed, (list, tuple)):
                bbox = {
                    "x1": parsed[0], "y1": parsed[1],
                    "x2": parsed[2], "y2": parsed[3],
                }
            elif isinstance(parsed, dict):
                bbox = parsed
        except (ValueError, TypeError, IndexError):
            logger.debug("Ignoring unparseable bbox: %r", bbox_raw)

    return Detection.objects.create(
        incident=incident,
        camera=camera,
        incident_type=type_obj,
        confidence_score=confidence,
        bbox_coords=bbox,
        frame_timestamp=timezone.now(),
        snapshot_image=evidence,
    )


def find_open_incident(camera, lock=False):
    """
    Return the still-open *live* incident for a camera, or None.

    Used to group repeat AI detections: while a live incident is open the
    camera keeps folding new detections into it instead of raising a new
    alert. Simulations are deliberately excluded — they are test alerts, so
    they must not occupy a camera's live slot and mask real detections.
    """
    if camera is None:
        return None

    queryset = Incident.objects.filter(
        camera=camera,
        source=Incident.Source.AI,
    ).exclude(
        status__name__in=CLOSED_INCIDENT_STATUSES
    )
    if lock:
        queryset = queryset.select_for_update()
    return queryset.order_by("-detected_at").first()


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


def broadcast_stats_changed():
    """
    Tell every connected client that a dashboard figure may have moved.

    Incident creates and updates already carry their own payload, but other
    writes the dashboard counts have nothing meaningful to send — a camera
    being added, a user being deleted, an incident being removed. Those left
    the tiles stale until the next poll, so clients refetch on this hint
    instead. Deliberately payload-free: the dashboard re-reads the numbers
    rather than trusting a count computed before the write finished.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "incidents",
            {"type": "stats_changed"},
        )
    except Exception as e:
        logger.error(f"WebSocket Stats Broadcast Failed: {e}")


def broadcast_camera_changed(camera, action: str):
    """
    Tell clients a camera row was created, edited or removed.

    The Incidents page labels each row with its camera's name and location, so
    renaming a camera has to reach those cards as well as the camera list.
    Carrying the id lets a client drop the matching row instantly; clients that
    just refetch are still correct without it.
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "incidents",
            {
                "type": "camera_changed",
                "payload": {
                    "action": action,
                    "camera_id": camera.id,
                    "name": camera.name,
                    "location_name": camera.location_name,
                },
            },
        )
    except Exception as e:
        logger.error(f"WebSocket Camera Broadcast Failed: {e}")


def broadcast_notification(notification):
    """
    Push a notification to the user it is addressed to. Every notification
    has a recipient, so it is sent to that user's private group
    (user_{id}) — admins and tanods never receive each other's toasts.
    """
    try:
        recipient = getattr(notification, "recipient", None)
        if recipient is not None and not getattr(recipient, "receive_notifications", True):
            return
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

    # Skip users who have opted out of notifications (receive_notifications=False).
    for recipient in User.objects.filter(
        role__name__in=["CCTV Chief", "CCTV Operator"],
        receive_notifications=True,
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

    return None


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

    # 2) Dispatch notifications — tanod users only (opt-out users skipped)
    tanod_users = User.objects.filter(
        role__name="Barangay Tanod",
        receive_notifications=True,
    )
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

    def perform_destroy(self, instance):
        instance.delete()
        # Every incident write moves the dashboard's incident tallies.
        broadcast_stats_changed()

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
        # Callers that omit `source` are treated as simulations, which always
        # create a fresh incident + alert. Only live AI detections are grouped.
        source = request.data.get("source") or Incident.Source.SIMULATION

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

        group_repeats = source == Incident.Source.AI
        is_test_alert = source == Incident.Source.SIMULATION
        evidence = request.FILES.get("evidence") or None
        bbox_raw = request.data.get("bbox")

        # A simulation can fire a small burst so the review list has something
        # to triage. Live AI cadence is driven by the detector, not by this.
        repeat = 1
        if is_test_alert:
            try:
                repeat = max(1, min(int(request.data.get("repeat") or 1), 10))
            except (TypeError, ValueError):
                repeat = 1

        with transaction.atomic():
            open_incident = (
                find_open_incident(camera, lock=True)
                if group_repeats
                else None
            )

            if open_incident is not None:
                # Same camera, same ongoing incident — fold this detection into
                # it and stay silent so operators get exactly one alert. The hit
                # is still recorded so the detail screen can list them all.
                updates = {"detection_count": F("detection_count") + 1}
                if confidence > open_incident.confidence_score:
                    updates["confidence_score"] = confidence

                Incident.objects.filter(pk=open_incident.pk).update(**updates)
                open_incident.refresh_from_db(fields=list(updates))

                record_detection_hit(
                    open_incident, type_obj, camera, confidence,
                    evidence, bbox_raw,
                )

                logger.info(
                    "[Incidents] Grouped repeat detection into incident "
                    "%s (camera=%s, count=%s)",
                    open_incident.pk,
                    camera.name if camera else None,
                    open_incident.detection_count,
                )

                data = IncidentSerializer(
                    open_incident,
                    context={"request": request},
                ).data

                return Response(
                    {**data, "grouped": True},
                    status=status.HTTP_200_OK,
                )

            incident = Incident.objects.create(
                incident_type=type_obj,
                severity="Medium" if confidence < 0.8 else "High",
                status=IncidentStatus.objects.get(name="Detected"),
                camera=camera,
                confidence_score=confidence,
                description=f"AI detected {type_obj.name} from {camera.name if camera else 'simulation'}",
                recorded_by=request.user,
                source=source,
                evidence_image=evidence,
            )

            recorded = 0
            for index in range(repeat):
                row = record_detection_hit(
                    incident, type_obj, camera, confidence,
                    # Only the first row carries the snapshot; repeating the same
                    # image per hit would just multiply the storage.
                    evidence if index == 0 else None,
                    bbox_raw,
                )
                if row is not None:
                    recorded += 1

            # The counter must match the rows actually kept, otherwise the card
            # reports a single hit for a multi-hit burst.
            if recorded != incident.detection_count:
                incident.detection_count = recorded
                incident.save(update_fields=["detection_count"])

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
            {**data, "grouped": False},
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

    @action(detail=False, methods=["get", "delete"], url_path="by-camera")
    def by_camera(self, request) -> Response:
        if request.method == "DELETE":
            return self.delete_open_by_camera(request)

        """
        One row per camera that has an open incident.

        Operators think in cameras, not in individual detections, so the
        incidents list is grouped: a camera appears once, pointing at its most
        recent open incident, with the review progress for its detections.
        """
        from apps.detections.models import Detection

        open_incidents = (
            Incident.objects.select_related("camera", "incident_type", "status")
            .exclude(status__name__in=CLOSED_INCIDENT_STATUSES)
            .order_by("-detected_at")
        )

        # Newest open incident per camera. Done in Python rather than with
        # .distinct("camera_id") so it also works on SQLite.
        newest_by_camera: dict = {}
        unassigned: list = []
        for incident in open_incidents:
            # Deleting a camera nulls out its incidents, so those rows would
            # otherwise sit in the database counted on the dashboard while
            # being unreachable here. Surface them as one placeholder row.
            if incident.camera_id is None:
                unassigned.append(incident)
            else:
                newest_by_camera.setdefault(incident.camera_id, incident)

        groups = list(newest_by_camera.items())
        if unassigned:
            groups.append((None, unassigned[0]))

        rows = []
        for camera_id, incident in groups:
            detections = Detection.objects.filter(incident=incident)

            verdicts = {
                row["verdict"]: row["n"]
                for row in detections.values("verdict").annotate(n=Count("id"))
            }

            # A camera can detect more than one kind of thing during a single
            # incident (a fire and its smoke, say). Surface every distinct type
            # so the camera row isn't reduced to whatever fired first.
            incident_types = [incident.incident_type.name]
            for row in (
                detections.values("incident_type__name")
                .annotate(n=Count("id"), first_seen=Min("id"))
                .order_by("-n", "first_seen")
            ):
                name = row["incident_type__name"]
                if name not in incident_types:
                    incident_types.append(name)

            rows.append(
                {
                    "camera": camera_id,
                    "camera_name": (
                        incident.camera.name
                        if incident.camera_id is not None
                        else UNASSIGNED_CAMERA_LABEL
                    ),
                    "location_name": (
                        incident.camera.location_name
                        if incident.camera_id is not None
                        else None
                    ),
                    "incident": IncidentSerializer(
                        incident,
                        context={"request": request},
                    ).data,
                    "detection_count": incident.detection_count,
                    "incident_types": incident_types,
                    "verdict_counts": {
                        "pending": verdicts.get("pending", 0),
                        "true": verdicts.get("true", 0),
                        "false": verdicts.get("false", 0),
                    },
                }
            )

        return Response(rows)

    def delete_open_by_camera(self, request) -> Response:
        """
        Clear every open incident on the given cameras.

        The list shows one row per camera, but a camera can hold several open
        incidents at once — repeated simulations each open their own, for
        example. Deleting only the row's newest incident left the older ones
        behind, so the operator had to repeat "delete all" until every batch
        was gone. Deleting a camera row now means clearing that camera.
        """
        raw = request.data.get("camera_ids") or []
        if not isinstance(raw, list):
            return Response(
                {"error": "camera_ids must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # `null` stands for the placeholder row, i.e. every open incident
        # whose camera has since been deleted.
        camera_ids: list[int] = []
        include_unassigned = False
        for value in raw:
            if value is None:
                include_unassigned = True
                continue
            try:
                camera_ids.append(int(value))
            except (TypeError, ValueError):
                return Response(
                    {"error": "camera_ids must contain integers or null"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not camera_ids and not include_unassigned:
            return Response({"deleted": 0})

        doomed = Incident.objects.filter(
            Q(camera_id__in=camera_ids) | Q(camera__isnull=True)
        ).exclude(
            status__name__in=CLOSED_INCIDENT_STATUSES
        )

        deleted = doomed.count()
        doomed.delete()
        broadcast_stats_changed()

        return Response({"deleted": deleted})

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request) -> Response:
        """
        Real numbers for the dashboard. Every count is derived from the live
        tables so the page never has to fall back on placeholder figures.
        """
        from apps.accounts.models import User
        from apps.detections.models import Detection

        base = Incident.objects.all()
        open_incidents = base.exclude(status__name__in=CLOSED_INCIDENT_STATUSES)

        # Soft-deleted accounts (is_active=False) are hidden everywhere else,
        # so they must not inflate the user totals either.
        active_users = User.objects.filter(is_active=True)

        def tally(queryset, field) -> list:
            return [
                {"name": row[field], "count": row["n"]}
                for row in queryset
            ]

        # `Detection.incident` is SET_NULL, so a deleted incident leaves its
        # detections behind. Counting those would make the verdict ring grow
        # past the incidents an operator can actually see.
        reviewed = Detection.objects.filter(incident__isnull=False)
        verdicts = {
            choice: reviewed.filter(verdict=choice).count()
            for choice in Detection.Verdict.values
        }

        return Response({
            "total_users": active_users.count(),
            "total_cameras": Camera.objects.count(),
            "total_tanods": active_users.filter(
                role__name="Barangay Tanod"
            ).count(),
            "total_incidents": base.count(),
            "active_incidents": open_incidents.count(),
            "today_incidents": base.filter(
                detected_at__date=timezone.now().date()
            ).count(),
            "by_status": tally(
                base.values("status__name")
                .annotate(n=Count("id"))
                .order_by("-n"),
                "status__name",
            ),
            "by_type": tally(
                base.values("incident_type__name")
                .annotate(n=Count("id"))
                .order_by("-n"),
                "incident_type__name",
            ),
            "verdicts": {
                "pending": verdicts.get(Detection.Verdict.PENDING, 0),
                "true": verdicts.get(Detection.Verdict.TRUE, 0),
                "false": verdicts.get(Detection.Verdict.FALSE, 0),
            },
        })

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None) -> Response:
        from apps.dispatch.serializers import IncidentTimelineSerializer
        qs = IncidentTimeline.objects.select_related("actor").filter(incident_id=pk).order_by("created_at")
        serializer = IncidentTimelineSerializer(qs, many=True)
        return Response(serializer.data)
