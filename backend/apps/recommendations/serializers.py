import logging
from rest_framework import serializers
from .models import Recommendation

logger = logging.getLogger(__name__)


class RecommendationSerializer(serializers.ModelSerializer):
    incident_type = serializers.CharField(source="incident.incident_type", read_only=True)
    accepted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Recommendation
        fields = [
            "id", "incident", "incident_type", "responder_type",
            "suggested_action", "priority", "explanation",
            "confidence_score", "reasoning", "is_accepted",
            "accepted_by", "accepted_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_accepted_by_name(self, obj: Recommendation) -> str:
        if obj.accepted_by:
            return obj.accepted_by.get_full_name() or obj.accepted_by.username
        return ""


class RecommendationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = [
            "incident", "responder_type", "suggested_action", "priority",
            "explanation", "confidence_score", "reasoning",
        ]

    def validate_confidence_score(self, value: float) -> float:
        if not 0.0 <= value <= 1.0:
            raise serializers.ValidationError("Confidence score must be between 0.0 and 1.0.")
        return value


class RecommendationActionSerializer(serializers.Serializer):
    is_accepted = serializers.BooleanField()
