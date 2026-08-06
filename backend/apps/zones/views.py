from rest_framework import viewsets, permissions
from .models import Zone
from .serializers import ZoneSerializer, ZoneListSerializer


class ZoneViewSet(viewsets.ModelViewSet):
    queryset = Zone.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name", "barangay", "description"]
    ordering_fields = ["name", "barangay", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ZoneListSerializer
        return ZoneSerializer
