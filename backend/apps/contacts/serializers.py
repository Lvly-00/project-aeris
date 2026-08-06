from rest_framework import serializers
from .models import EmergencyContact


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = [
            "id", "name", "phone_number", "incident_type",
            "zone", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
