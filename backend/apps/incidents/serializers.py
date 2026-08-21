import logging
from rest_framework import serializers
from apps.lookups.models import IncidentStatus, IncidentType
from .models import Incident

logger = logging.getLogger(__name__)


class IncidentSerializer(serializers.ModelSerializer):
    # Expose the lookup FKs as their human-readable names so the
    # frontend keeps receiving/sending plain strings ("Fire", "Detected").
    incident_type = serializers.SlugRelatedField(
        slug_field="name", queryset=IncidentType.objects.all()
    )
    status = serializers.SlugRelatedField(
        slug_field="name", queryset=IncidentStatus.objects.all()
    )
    camera_name = serializers.CharField(source="camera.name", read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()
    dismissed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id", "incident_type", "severity", "status", "camera", "camera_name",
            "confidence_score", "description", "detected_at", "verified_at",
            "dispatched_at", "responded_at", "resolved_at", "archived_at",
            "dismissed_at", "recorded_by", "recorded_by_name", "verified_by",
            "verified_by_name", "dismissed_by", "dismissed_by_name",
            "evidence_image", "evidence_gallery", "duration", "created_at",
        ]
        read_only_fields = [
            "id", "detected_at", "verified_at", "dispatched_at", "responded_at",
            "resolved_at", "archived_at", "dismissed_at", "created_at",
        ]

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.email
        return ""

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.get_full_name() or obj.verified_by.email
        return ""

    def get_dismissed_by_name(self, obj):
        if obj.dismissed_by:
            return obj.dismissed_by.get_full_name() or obj.dismissed_by.email
        return ""


class IncidentCreateSerializer(serializers.ModelSerializer):
    incident_type = serializers.SlugRelatedField(
        slug_field="name", queryset=IncidentType.objects.all()
    )

    class Meta:
        model = Incident
        fields = [
            "incident_type", "severity", "camera", "confidence_score",
            "description", "evidence_image", "duration",
        ]

    def validate_confidence_score(self, value):
        if not 0.0 <= value <= 1.0:
            raise serializers.ValidationError("Confidence score must be between 0.0 and 1.0.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["recorded_by"] = request.user
        validated_data.setdefault(
            "status", IncidentStatus.objects.get(name="Detected")
        )
        return super().create(validated_data)


class IncidentListSerializer(serializers.ModelSerializer):
    incident_type = serializers.CharField(source="incident_type.name", read_only=True)
    status = serializers.CharField(source="status.name", read_only=True)
    camera_name = serializers.CharField(source="camera.name", read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id", "incident_type", "severity", "status", "camera_name",
            "confidence_score", "description", "detected_at", "duration",
        ]


class IncidentStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[])
    notes = serializers.CharField(required=False, allow_blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["status"].choices = list(
            IncidentStatus.objects.values_list("name", flat=True)
        )

    def validate_status(self, value):
        valid = list(IncidentStatus.objects.values_list("name", flat=True))
        if value not in valid:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid)}")
        return value
