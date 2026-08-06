from rest_framework import serializers
from .models import Zone


class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = "__all__"
        read_only_fields = ["created_at"]

    def validate_name(self, value: str) -> str:
        qs = Zone.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A zone with this name already exists.")
        return value


class ZoneListSerializer(serializers.ModelSerializer):
    camera_count = serializers.SerializerMethodField()
    incident_count = serializers.SerializerMethodField()

    class Meta:
        model = Zone
        fields = ["id", "name", "barangay", "description", "camera_count", "incident_count", "created_at"]

    def get_camera_count(self, obj: Zone) -> int:
        return getattr(obj, "camera_count", obj.cameras.count())

    def get_incident_count(self, obj: Zone) -> int:
        return getattr(obj, "incident_count", obj.incidents.count())
