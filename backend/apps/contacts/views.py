import logging
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.audit.models import AuditLog
from apps.audit.services import write_audit
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

    def _audit_contact(self, request, *, action, contact, resource_id=None, details_extra=None):
        details = {"name": contact.name, "phone_number": contact.phone_number}
        if details_extra:
            details.update(details_extra)
        write_audit(
            request,
            action,
            user=request.user,
            resource_type="Contact",
            resource_id=resource_id if resource_id is not None else contact.pk,
            details=details,
        )

    def perform_create(self, serializer):
        contact = serializer.save()
        self._audit_contact(
            self.request,
            action=AuditLog.Action.SETTINGS_CHANGED,
            contact=contact,
            details_extra={"reason": "contact_created"},
        )
        return contact

    def perform_update(self, serializer):
        contact = serializer.save()
        self._audit_contact(
            self.request,
            action=AuditLog.Action.SETTINGS_CHANGED,
            contact=contact,
            details_extra={"reason": "contact_updated"},
        )
        return contact

    def perform_destroy(self, instance):
        contact_id = instance.pk
        self._audit_contact(
            self.request,
            action=AuditLog.Action.SETTINGS_CHANGED,
            contact=instance,
            resource_id=contact_id,
            details_extra={"reason": "contact_deleted"},
        )
        instance.delete()
