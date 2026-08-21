import logging
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import EmergencyContact
from .serializers import EmergencyContactSerializer

logger = logging.getLogger(__name__)


class EmergencyContactViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_active"]

    def get_queryset(self):
        qs = EmergencyContact.objects.select_related("incident_type").all()
        incident_type = self.request.query_params.get("incident_type")
        if incident_type:
            # NULL incident_type means "General" — always include it.
            qs = qs.filter(
                incident_type__name=incident_type
            ) | qs.filter(incident_type__isnull=True)
            qs = qs.filter(is_active=True)
        return qs.distinct()
