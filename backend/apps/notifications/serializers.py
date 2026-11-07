import logging
from rest_framework import serializers
from .models import Notification

logger = logging.getLogger(__name__)


class NotificationSerializer(serializers.ModelSerializer):
    # Expose the lookup FK as its name so the payload stays string-based.
    notification_type = serializers.CharField(source="notification_type.name", read_only=True)

    # Extra incident context used by the notification tray rows.
    incident_type = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    evidence_image = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "incident", "title", "message", "notification_type",
            "priority", "is_read", "recipient", "created_at",
            "incident_type", "location", "evidence_image",
        ]
        read_only_fields = ["id", "created_at"]

    def get_incident_type(self, obj):
        incident = obj.incident
        if incident is None:
            return None
        return incident.incident_type.name

    def get_location(self, obj):
        """Where the alert happened: the camera's location, else its name.

        Location is optional on a camera, so an unlabelled one is identified by
        its name rather than reporting no place at all. Notifications with no
        camera behind them return None and the tray falls back to the incident.
        """
        incident = obj.incident
        camera = incident.camera if incident else None
        if camera is None:
            return None
        return camera.location_name or camera.name

    def get_evidence_image(self, obj):
        """The frame that triggered the incident, shown as the row thumbnail.

        Falls back to the first gallery frame when the incident was recorded
        without a cover image. The WebSocket payload is built without a
        request, so a relative path is returned there and resolved client-side.
        """
        incident = obj.incident
        if incident is None:
            return None

        if incident.evidence_image:
            url = incident.evidence_image.url
        else:
            gallery = incident.evidence_gallery or []
            url = gallery[0] if gallery else None

        if not url:
            return None

        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class NotificationMarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    all = serializers.BooleanField(default=False)
