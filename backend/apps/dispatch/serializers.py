from rest_framework import serializers
from apps.incidents.serializers import IncidentSerializer
from .models import Dispatcher, Dispatch, DispatchMessage, IncidentTimeline


class DispatcherSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Dispatcher
        fields = [
            "id", "user", "username", "full_name", "dispatcher_type",
            "status", "phone_number", "zone", "current_lat", "current_lng",
            "last_location_update", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class DispatchSerializer(serializers.ModelSerializer):
    dispatcher_name = serializers.SerializerMethodField()
    dispatcher_type = serializers.CharField(
        source="dispatcher.dispatcher_type", read_only=True
    )
    incident_type = serializers.CharField(
        source="incident.incident_type", read_only=True
    )
    incident_severity = serializers.CharField(
        source="incident.severity", read_only=True
    )
    dispatched_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Dispatch
        fields = [
            "id", "incident", "dispatcher", "dispatcher_name",
            "dispatcher_type", "incident_type", "incident_severity",
            "status", "dispatched_by", "dispatched_by_name",
            "notes", "accepted_at", "en_route_at", "on_scene_at",
            "completed_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "accepted_at", "en_route_at", "on_scene_at",
            "completed_at", "created_at", "updated_at",
        ]

    def get_dispatcher_name(self, obj):
        return str(obj.dispatcher)

    def get_dispatched_by_name(self, obj):
        if obj.dispatched_by:
            return obj.dispatched_by.get_full_name() or obj.dispatched_by.username
        return ""


class DispatchStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Dispatch.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class DispatchMessageSerializer(serializers.ModelSerializer):
    incident_data = IncidentSerializer(source="incident", read_only=True)

    class Meta:
        model = DispatchMessage
        fields = [
            "id", "incident", "incident_data", "title", "body",
            "recipient", "is_read", "read_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "read_at"]


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
            return obj.actor.get_full_name() or obj.actor.username
        return ""
