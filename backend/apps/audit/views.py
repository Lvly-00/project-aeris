import logging
from django_filters import rest_framework as filters
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AuditLog
from .serializers import AuditLogSerializer

logger = logging.getLogger(__name__)


class AuditLogFilter(filters.FilterSet):
    action = filters.CharFilter(field_name="action", lookup_expr="iexact")
    start_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    end_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditLog
        fields = ["action", "user", "resource_type", "start_date", "end_date"]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = AuditLogFilter
    search_fields = [
        "user__first_name",
        "user__last_name",
        "user__email",
        "ip_address",
        "user_agent",
        "action",
    ]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        user = self.request.user
        if user.role.name != "CCTV Chief":
            qs = qs.filter(user=user)
        return qs

    @action(detail=False, methods=["get"], url_path="actions")
    def actions(self, request) -> Response:
        values = (
            AuditLog.objects.filter(user=self.request.user)
            if self.request.user.role.name != "CCTV Chief"
            else AuditLog.objects
        )
        return Response(list(values.values_list("action", flat=True).distinct().order_by("action")))

    @action(detail=False, methods=["get"], url_path="recent")
    def recent(self, request) -> Response:
        qs = self.get_queryset()[:50]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)