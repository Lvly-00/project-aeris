import logging
from rest_framework import serializers
from .models import Incident

logger = logging.getLogger(__name__)


class IncidentSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source="camera.name", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()
    dismissed_by_name = serializers.SerializerMethodField()
    dispatch_count = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id", "incident_type", "severity", "status", "camera", "camera_name",
            "zone", "zone_name", "confidence_score", "description", "location_lat",
            "location_lng", "detected_at", "verified_at", "dispatched_at",
            "responded_at", "resolved_at", "archived_at", "dismissed_at",
            "recorded_by", "recorded_by_name", "verified_by", "verified_by_name",
            "dismissed_by", "dismissed_by_name",
            "evidence_image", "evidence_gallery", "duration", "crowd_size",
            "review_notes", "escalated_to", "dispatch_count",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "detected_at", "verified_at", "dispatched_at", "responded_at",
            "resolved_at", "archived_at", "dismissed_at", "created_at", "updated_at",
        ]

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.username
        return ""

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.get_full_name() or obj.verified_by.username
        return ""

    def get_dismissed_by_name(self, obj):
        if obj.dismissed_by:
            return obj.dismissed_by.get_full_name() or obj.dismissed_by.username
        return ""

    def get_dispatch_count(self, obj):
        return obj.dispatches.count()


class IncidentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = [
            "incident_type", "severity", "camera", "zone", "confidence_score",
            "description", "location_lat", "location_lng", "evidence_image",
            "duration", "crowd_size",
        ]

    def validate_confidence_score(self, value):
        if not 0.0 <= value <= 1.0:
            raise serializers.ValidationError("Confidence score must be between 0.0 and 1.0.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["recorded_by"] = request.user
        return super().create(validated_data)


class IncidentListSerializer(serializers.ModelSerializer):
    camera_name = serializers.CharField(source="camera.name", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id", "incident_type", "severity", "status", "camera_name",
            "zone_name", "confidence_score", "description", "detected_at",
            "duration", "crowd_size",
        ]


class IncidentStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Incident.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        valid = [c[0] for c in Incident.Status.choices]
        if value not in valid:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid)}")
        return value
