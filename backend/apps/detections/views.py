import logging
from rest_framework import viewsets, permissions
from .models import Detection
from .serializers import (
    DetectionSerializer,
    DetectionCreateSerializer,
    DetectionListSerializer,
)

logger = logging.getLogger(__name__)


class DetectionViewSet(viewsets.ModelViewSet):
    queryset = Detection.objects.select_related("camera", "incident").all()
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["incident_type"]
    filterset_fields = ["incident_type", "camera", "incident", "is_verified", "processed"]

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
            qs = qs.filter(incident_type=incident_type)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
        return qs
