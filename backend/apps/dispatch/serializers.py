from rest_framework import serializers
from apps.incidents.serializers import IncidentSerializer
from .models import DispatchMessage, IncidentTimeline


class DispatchMessageSerializer(serializers.ModelSerializer):
    incident_data = IncidentSerializer(source="incident", read_only=True)
    dispatched_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DispatchMessage
        fields = [
            "id", "incident", "incident_data", "title", "body",
            "dispatched_by", "dispatched_by_name",
            "recipient", "is_read", "read_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "read_at"]

    def get_dispatched_by_name(self, obj):
        if obj.dispatched_by:
            return obj.dispatched_by.get_full_name() or obj.dispatched_by.email
        return ""


class IncidentTimelineSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = IncidentTimeline
        fields = [
            "id", "incident", "event_type", "title", "description",
            "actor", "actor_name", "metadata", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.email
        return ""
