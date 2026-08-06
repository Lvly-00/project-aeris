import logging
from datetime import datetime, timedelta
from django.db.models import Count, Q, F, Avg, DurationField, ExpressionWrapper
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsAdmin, CanVerifyIncident, CanDispatch
from apps.cameras.models import Camera
from apps.dispatch.models import IncidentTimeline
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
        logger.warning("Failed to broadcast incident: %s", e)


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related(
        "camera", "zone", "recorded_by", "verified_by", "dismissed_by"
    ).prefetch_related("dispatches").all()
    permission_classes = [IsAuthenticated]
    search_fields = ["incident_type", "description", "status"]
    filterset_class = IncidentFilter

    def get_serializer_class(self):
        if self.action == "create":
            return IncidentCreateSerializer
        if self.action == "list":
            return IncidentListSerializer
        return IncidentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role in ("Barangay_Tanod", "Barangay_Official") and user.barangay_zone_id:
            qs = qs.filter(zone_id=user.barangay_zone_id)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(detected_at__gte=date_from)
        if date_to:
            qs = qs.filter(detected_at__lte=date_to)
        return qs

    def perform_create(self, serializer):
        incident = serializer.save()
        IncidentTimeline.objects.create(
            incident=incident,
            event_type=IncidentTimeline.EventType.DETECTED,
            title=f"{incident.incident_type} detected",
            description=incident.description,
            actor=self.request.user,
            metadata={"confidence": incident.confidence_score},
        )
        broadcast_incident(
            "incident_created",
            IncidentSerializer(incident, context={"request": self.request}).data,
        )

    @action(detail=False, methods=["post"], url_path="create-from-detection")
    def create_from_detection(self, request) -> Response:
        incident_type = request.data.get("incident_type")
        confidence = float(request.data.get("confidence_score", 0))
        camera_id = request.data.get("camera_id")
        bbox = request.data.get("bbox")
        evidence = request.FILES.get("evidence")
        crowd_size = request.data.get("crowd_size")

        if not incident_type or not camera_id:
            return Response({"error": "incident_type and camera_id required"}, status=400)

        from apps.cameras.models import Camera
        try:
            camera = Camera.objects.get(id=camera_id)
        except Camera.DoesNotExist:
            return Response({"error": "Camera not found"}, status=404)

        dedup_window = timezone.now() - timedelta(minutes=10)
        recent = Incident.objects.filter(
            camera=camera,
            incident_type=incident_type,
            detected_at__gte=dedup_window,
        ).exclude(
            status__in=[Incident.Status.RESOLVED, Incident.Status.DISMISSED, Incident.Status.ARCHIVED]
        ).first()
        if recent:
            return Response(
                IncidentSerializer(recent, context={"request": request}).data,
                status=200,
            )

        if confidence >= 0.95:
            severity = "Critical"
        elif confidence >= 0.7:
            severity = "High"
        elif confidence >= 0.4:
            severity = "Medium"
        else:
            severity = "Low"

        incident_kwargs = dict(
            incident_type=incident_type,
            severity=severity,
            status=Incident.Status.DETECTED,
            camera=camera,
            zone=camera.zone,
            location_lat=camera.latitude,
            location_lng=camera.longitude,
            confidence_score=confidence,
            description=f"AI detected {incident_type} with {confidence:.1%} confidence from {camera.name}",
            recorded_by=request.user,
        )
        if evidence:
            incident_kwargs["evidence_image"] = evidence
        if crowd_size:
            incident_kwargs["crowd_size"] = int(crowd_size)
        incident = Incident.objects.create(**incident_kwargs)

        IncidentTimeline.objects.create(
            incident=incident,
            event_type=IncidentTimeline.EventType.DETECTED,
            title=f"{incident_type} detected by AI",
            description=incident.description,
            metadata={"confidence": confidence, "camera": camera.name},
        )

        from apps.notifications.models import Notification
        priority_map = {"Critical": "Critical", "High": "High", "Medium": "Medium", "Low": "Low"}
        Notification.objects.create(
            incident=incident,
            title=f"{incident_type} Detected",
            message=f"{incident_type} detected at {camera.location_name or camera.name} with {confidence:.1%} confidence",
            notification_type=Notification.NotificationType.ALERT,
            priority=priority_map.get(severity, "Medium"),
        )

        from apps.recommendations.models import Recommendation
        responder_map = {
            "Fire": [Recommendation.ResponderType.BFP, Recommendation.ResponderType.MDRRMO],
            "Smoke": [Recommendation.ResponderType.BFP, Recommendation.ResponderType.MDRRMO],
            "Vehicle_Accident": [Recommendation.ResponderType.PNP, Recommendation.ResponderType.MDRRMO],
        }
        action_map = {
            "Fire": Recommendation.SuggestedAction.EMERGENCY_ESCALATION,
            "Smoke": Recommendation.SuggestedAction.VERIFY_INCIDENT,
            "Vehicle_Accident": Recommendation.SuggestedAction.DISPATCH_RESPONDERS,
        }
        responders = responder_map.get(incident_type, [Recommendation.ResponderType.BARANGAY_TANOD])
        suggested_action = action_map.get(incident_type, Recommendation.SuggestedAction.VERIFY_INCIDENT)
        for i, resp in enumerate(responders):
            Recommendation.objects.create(
                incident=incident,
                responder_type=resp,
                suggested_action=suggested_action,
                priority=severity,
                confidence_score=confidence,
                explanation=f"AI detected {incident_type} — recommended action: {suggested_action.replace('_', ' ')}",
                reasoning=f"Detection confidence: {confidence:.1%}. Assigning {resp.replace('_', ' ')} as primary responder.",
            )

        broadcast_incident(
            "incident_created",
            IncidentSerializer(incident, context={"request": request}).data,
        )

        logger.info("Incident %d created from AI detection: %s @ %.1f%%", incident.id, incident_type, confidence * 100)
        return Response(IncidentSerializer(incident, context={"request": request}).data, status=201)

    @action(detail=False, methods=["delete"], url_path="delete_all")
    def delete_all(self, request) -> Response:
        if request.user.role != "Admin":
            return Response({"error": "Only admins can delete all incidents"}, status=403)
        count, _ = Incident.objects.all().delete()
        logger.info("User %s deleted all %d incidents", request.user, count)
        return Response({"deleted": count}, status=200)

    @action(detail=True, methods=["patch"], url_path="status")
    def status_transition(self, request, pk=None) -> Response:
        incident = self.get_object()
        serializer = IncidentStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")
        now = timezone.now()

        user = request.user
        allowed_transitions = {
            Incident.Status.DETECTED: [Incident.Status.PENDING_VERIFICATION, Incident.Status.DISMISSED],
            Incident.Status.PENDING_VERIFICATION: [Incident.Status.VERIFIED, Incident.Status.DISMISSED, Incident.Status.FALSE_POSITIVE],
            Incident.Status.VERIFIED: [Incident.Status.DISPATCHED, Incident.Status.DISMISSED],
            Incident.Status.DISPATCHED: [Incident.Status.RESPONDING, Incident.Status.RESOLVED],
            Incident.Status.RESPONDING: [Incident.Status.RESOLVED],
            Incident.Status.RESOLVED: [Incident.Status.ARCHIVED],
            Incident.Status.DISMISSED: [Incident.Status.DETECTED],
            Incident.Status.FALSE_POSITIVE: [],
            Incident.Status.ARCHIVED: [],
        }

        if new_status not in allowed_transitions.get(incident.status, []):
            return Response(
                {"error": f"Cannot transition from {incident.status} to {new_status}"},
                status=400,
            )

        if new_status == Incident.Status.VERIFIED and not user.can_verify():
            return Response({"error": "You do not have permission to verify incidents"}, status=403)

        if new_status in (Incident.Status.DISMISSED, Incident.Status.FALSE_POSITIVE) and not user.can_verify():
            return Response({"error": "You do not have permission to dismiss incidents"}, status=403)

        if new_status == Incident.Status.DISPATCHED and not user.can_dispatch():
            return Response({"error": "You do not have permission to dispatch incidents"}, status=403)

        status_timestamps = {
            Incident.Status.VERIFIED: "verified_at",
            Incident.Status.DISPATCHED: "dispatched_at",
            Incident.Status.RESPONDING: "responded_at",
            Incident.Status.RESOLVED: "resolved_at",
            Incident.Status.ARCHIVED: "archived_at",
            Incident.Status.DISMISSED: "dismissed_at",
        }

        setattr(incident, "status", new_status)
        if new_status in status_timestamps:
            ts_field = status_timestamps[new_status]
            if getattr(incident, ts_field) is None:
                setattr(incident, ts_field, now)

        if new_status == Incident.Status.VERIFIED:
            incident.verified_by = user
        elif new_status == Incident.Status.DISMISSED or new_status == Incident.Status.FALSE_POSITIVE:
            incident.dismissed_by = user

        if new_status == Incident.Status.RESOLVED and incident.detected_at:
            incident.duration = now - incident.detected_at

        if notes:
            incident.review_notes = (incident.review_notes + "\n" + notes).strip()

        incident.save()

        event_type_map = {
            Incident.Status.VERIFIED: IncidentTimeline.EventType.VERIFIED,
            Incident.Status.DISPATCHED: IncidentTimeline.EventType.DISPATCHED,
            Incident.Status.RESPONDING: IncidentTimeline.EventType.RESPONDING,
            Incident.Status.RESOLVED: IncidentTimeline.EventType.RESOLVED,
            Incident.Status.ARCHIVED: IncidentTimeline.EventType.ARCHIVED,
            Incident.Status.DISMISSED: IncidentTimeline.EventType.DISMISSED,
            Incident.Status.FALSE_POSITIVE: IncidentTimeline.EventType.DISMISSED,
        }
        timeline_event = event_type_map.get(new_status)
        if timeline_event:
            IncidentTimeline.objects.create(
                incident=incident,
                event_type=timeline_event,
                title=f"Incident {new_status.lower()}",
                description=notes or f"Status changed to {new_status}",
                actor=user,
                metadata={"previous_status": incident.status, "new_status": new_status},
            )

        from apps.audit.models import AuditLog
        audit_action_map = {
            Incident.Status.VERIFIED: AuditLog.Action.INCIDENT_VERIFIED,
            Incident.Status.DISMISSED: AuditLog.Action.INCIDENT_DISMISSED,
            Incident.Status.RESOLVED: AuditLog.Action.INCIDENT_RESOLVED,
            Incident.Status.ARCHIVED: AuditLog.Action.INCIDENT_ARCHIVED,
        }
        audit_action = audit_action_map.get(new_status)
        if not audit_action and new_status != incident.status:
            audit_action = AuditLog.Action.INCIDENT_UPDATED
        if audit_action:
            AuditLog.objects.create(
                user=user,
                action=audit_action,
                resource_type="Incident",
                resource_id=incident.id,
                details={"old_status": incident.status, "new_status": new_status, "notes": notes},
            )

        result = IncidentSerializer(incident).data
        broadcast_incident("incident_update", result)

        logger.info("Incident %s status changed to %s", incident.id, new_status)
        return Response(result)

    @action(detail=True, methods=["post"], url_path="verify")
    def verify(self, request, pk=None) -> Response:
        return self._transition_with_check(request, pk, Incident.Status.VERIFIED)

    @action(detail=True, methods=["post"], url_path="dismiss")
    def dismiss(self, request, pk=None) -> Response:
        return self._transition_with_check(request, pk, Incident.Status.DISMISSED)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None) -> Response:
        return self._transition_with_check(request, pk, Incident.Status.ARCHIVED)

    def _transition_with_check(self, request, pk, target_status):
        incident = self.get_object()
        if target_status == Incident.Status.VERIFIED and not request.user.can_verify():
            return Response({"error": "You do not have permission to verify incidents"}, status=403)
        return self.status_transition(request, pk)

    @action(detail=True, methods=["post"], url_path="add-evidence")
    def add_evidence(self, request, pk=None) -> Response:
        incident = self.get_object()
        if "image" not in request.FILES:
            return Response({"error": "No image file provided"}, status=400)
        image = request.FILES["image"]
        evidence_list = incident.evidence_gallery or []
        from django.core.files.storage import default_storage
        path = default_storage.save(f"evidence/{incident.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.jpg", image)
        evidence_list.append({"path": path, "uploaded_by": request.user.username, "uploaded_at": timezone.now().isoformat()})
        incident.evidence_gallery = evidence_list
        if not incident.evidence_image:
            incident.evidence_image = path
        incident.save()
        IncidentTimeline.objects.create(
            incident=incident,
            event_type=IncidentTimeline.EventType.EVIDENCE_ADDED,
            title="Evidence image added",
            actor=request.user,
        )
        return Response(IncidentSerializer(incident).data)

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request) -> Response:
        base = Incident.objects.all()
        total = base.count()
        now = timezone.now()
        today_incidents = base.filter(detected_at__date=now.date()).count()
        avg_response = (
            Incident.objects.filter(
                responded_at__isnull=False,
                detected_at__isnull=False,
            ).annotate(
                resp_time=ExpressionWrapper(
                    F("responded_at") - F("detected_at"),
                    output_field=DurationField(),
                )
            ).aggregate(avg=Avg("resp_time"))["avg"]
        )
        avg_seconds = avg_response.total_seconds() if avg_response else None
        return Response({
            "active_incidents": base.filter(
                ~Q(status__in=[Incident.Status.RESOLVED, Incident.Status.ARCHIVED, Incident.Status.DISMISSED, Incident.Status.FALSE_POSITIVE])
            ).count(),
            "total_incidents": total,
            "today_incidents": today_incidents,
            "avg_response_time": avg_seconds,
            "total_cameras": Camera.objects.count(),
            "by_status": base.values("status").annotate(count=Count("id")).order_by("status"),
            "by_type": base.values("incident_type").annotate(count=Count("id")).order_by("incident_type"),
            "by_severity": base.values("severity").annotate(count=Count("id")).order_by("severity"),
        })

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None) -> Response:
        from apps.dispatch.models import IncidentTimeline as IT
        from apps.dispatch.serializers import IncidentTimelineSerializer
        qs = IT.objects.select_related("actor").filter(incident_id=pk).order_by("created_at")
        serializer = IncidentTimelineSerializer(qs, many=True)
        return Response(serializer.data)
