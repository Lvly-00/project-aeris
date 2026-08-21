import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AuditLog
from .serializers import AuditLogSerializer

logger = logging.getLogger(__name__)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["action", "user", "resource_type"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        user = self.request.user
        if user.role.name != "CCTV Chief":
            qs = qs.filter(user=user)
        return qs

    @action(detail=False, methods=["get"], url_path="recent")
    def recent(self, request) -> Response:
        qs = self.get_queryset()[:50]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
