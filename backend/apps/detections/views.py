import logging
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Detection
from .serializers import (
    DetectionSerializer,
    DetectionCreateSerializer,
    DetectionListSerializer,
    DetectionVerdictSerializer,
)

logger = logging.getLogger(__name__)


class DetectionViewSet(viewsets.ModelViewSet):
    queryset = Detection.objects.select_related(
        "camera", "incident", "incident_type", "reviewed_by",
    ).all()
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["incident_type__name"]
    filterset_fields = ["camera", "incident", "is_verified", "processed", "verdict"]

    def get_serializer_class(self):
        if self.action == "create":
            return DetectionCreateSerializer
        if self.action == "list":
            return DetectionListSerializer
        return DetectionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        camera = self.request.query_params.get("camera")
        incident_type = self.request.query_params.get("incident_type")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if camera:
            qs = qs.filter(camera_id=camera)
        if incident_type:
            qs = qs.filter(incident_type__name=incident_type)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
        return qs

    @action(detail=True, methods=["patch"], url_path="verdict")
    def set_verdict(self, request, pk=None) -> Response:
        """
        Operator check/cross on a single detection.

        This is an annotation only — it never changes the parent incident's
        status, which still moves through the normal Verify/Dispatch buttons.
        """
        detection = self.get_object()
        serializer = DetectionVerdictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        detection.apply_verdict(serializer.validated_data["verdict"], request.user)

        logger.info(
            "[Detections] Detection %s for incident %s marked %s by %s",
            detection.pk,
            detection.incident_id,
            detection.verdict,
            request.user,
        )

        # Let other operators' open detail screens repaint their counts.
        if detection.incident_id:
            from apps.incidents.models import Incident
            from apps.incidents.serializers import IncidentSerializer
            from apps.incidents.views import broadcast_incident

            incident = Incident.objects.filter(pk=detection.incident_id).first()
            if incident:
                broadcast_incident(
                    "incident_update",
                    IncidentSerializer(incident).data,
                )

        return Response(DetectionSerializer(detection).data)
