from rest_framework import serializers
from apps.lookups.models import IncidentType
from .models import EmergencyContact


class EmergencyContactSerializer(serializers.ModelSerializer):
    # NULL incident_type means "General"; expose it as a plain string.
    incident_type = serializers.SlugRelatedField(
        slug_field="name",
        queryset=IncidentType.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = EmergencyContact
        fields = [
            "id", "name", "phone_number", "incident_type",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
