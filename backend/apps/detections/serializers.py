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
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Detection
        fields = [
            "id", "incident", "camera", "camera_name", "incident_type",
            "confidence_score", "bbox_coords",
            "fps", "frame_timestamp", "snapshot_image", "is_verified",
            "verdict", "reviewed_by", "reviewed_by_name", "reviewed_at",
            "processed", "created_at",
        ]
        read_only_fields = [
            "id", "created_at", "is_verified",
            "reviewed_by", "reviewed_by_name", "reviewed_at",
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return ""


class DetectionCreateSerializer(DetectionSerializer):
    class Meta(DetectionSerializer.Meta):
        fields = [
            "incident", "camera", "incident_type", "confidence_score",
            "bbox_coords", "fps", "frame_timestamp", "snapshot_image",
        ]


class DetectionVerdictSerializer(serializers.Serializer):
    """Input for the check/cross operator decision on a single detection."""

    verdict = serializers.ChoiceField(choices=Detection.Verdict.choices)

    def validate_verdict(self, value):
        return value


class DetectionListSerializer(serializers.ModelSerializer):
    incident_type = serializers.CharField(source="incident_type.name", read_only=True)
    camera_name = serializers.CharField(source="camera.name", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Detection
        fields = [
            "id", "incident", "camera", "camera_name", "incident_type",
            "confidence_score", "frame_timestamp", "snapshot_image",
            "is_verified", "verdict", "reviewed_by_name", "reviewed_at",
            "processed", "created_at",
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return ""
