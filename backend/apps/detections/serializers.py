import logging
from rest_framework import serializers
from apps.lookups.models import IncidentType
from .models import Detection

logger = logging.getLogger(__name__)


class DetectionSerializer(serializers.ModelSerializer):
    # Expose the incident type lookup FK as its name string.
    incident_type = serializers.SlugRelatedField(
        slug_field="name", queryset=IncidentType.objects.all()
    )
    camera_name = serializers.CharField(source="camera.name", read_only=True)

    class Meta:
        model = Detection
        fields = [
            "id", "incident", "camera", "camera_name", "incident_type",
            "confidence_score", "bbox_coords",
            "fps", "frame_timestamp", "snapshot_image", "is_verified",
            "processed", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DetectionCreateSerializer(DetectionSerializer):
    class Meta(DetectionSerializer.Meta):
        fields = [
            "incident", "camera", "incident_type", "confidence_score",
            "bbox_coords", "fps", "frame_timestamp", "snapshot_image",
        ]


class DetectionListSerializer(serializers.ModelSerializer):
    incident_type = serializers.CharField(source="incident_type.name", read_only=True)
    camera_name = serializers.CharField(source="camera.name", read_only=True)

    class Meta:
        model = Detection
        fields = [
            "id", "incident", "camera_name", "incident_type",
            "confidence_score", "frame_timestamp", "is_verified",
            "processed", "created_at",
        ]
