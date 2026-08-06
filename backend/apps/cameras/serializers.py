import logging
from rest_framework import serializers
from .models import Camera

logger = logging.getLogger(__name__)


class CameraSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = Camera
        fields = [
            "id", "name", "rtsp_url", "stream_type", "location_name",
            "latitude", "longitude", "zone", "zone_name", "is_active",
            "status", "last_seen", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_seen", "created_at", "updated_at"]


class CameraStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Camera.Status.choices)
    last_seen = serializers.DateTimeField(required=False)

    def validate_status(self, value: str) -> str:
        if value not in [c[0] for c in Camera.Status.choices]:
            raise serializers.ValidationError(f"Invalid status: {value}")
        return value
