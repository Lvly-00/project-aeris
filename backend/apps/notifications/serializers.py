import logging
from rest_framework import serializers
from .models import Notification

logger = logging.getLogger(__name__)


class NotificationSerializer(serializers.ModelSerializer):
    # Expose the lookup FK as its name so the payload stays string-based.
    notification_type = serializers.CharField(source="notification_type.name", read_only=True)

    # Extra incident context used by the notification tray cards.
    incident_type = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "incident", "title", "message", "notification_type",
            "priority", "is_read", "recipient", "created_at",
            "incident_type", "location",
        ]
        read_only_fields = ["id", "created_at"]

    def get_incident_type(self, obj):
        incident = obj.incident
        if incident is None:
            return None
        return incident.incident_type.name

    def get_location(self, obj):
        incident = obj.incident
        if incident and incident.camera and incident.camera.location_name:
            return incident.camera.location_name
        return "Unknown location"


class NotificationMarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    all = serializers.BooleanField(default=False)
