import logging
from rest_framework import serializers
from .models import Detection

logger = logging.getLogger(__name__)


class DetectionSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source="camera.name", read_only=True)
    incident_type_display = serializers.CharField(
        source="get_incident_type_display", read_only=True
    )

    class Meta:
        model = Detection
        fields = [
            "id", "incident", "camera", "camera_name", "incident_type",
            "incident_type_display", "confidence_score", "bbox_coords",
            "fps", "frame_timestamp", "snapshot_image", "is_verified",
            "processed", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DetectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Detection
        fields = [
            "incident", "camera", "incident_type", "confidence_score",
            "bbox_coords", "fps", "frame_timestamp", "snapshot_image",
        ]

    def validate_confidence_score(self, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise serializers.ValidationError("Confidence score must be between 0.0 and 1.0.")
        return value


class DetectionListSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source="camera.name", read_only=True)

    class Meta:
        model = Detection
        fields = [
            "id", "incident", "camera_name", "incident_type",
            "confidence_score", "frame_timestamp", "is_verified",
            "processed", "created_at",
        ]
