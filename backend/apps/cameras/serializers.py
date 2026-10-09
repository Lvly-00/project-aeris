import logging
from rest_framework import serializers
from apps.lookups.models import CameraStatus
from .models import Camera

logger = logging.getLogger(__name__)


class CameraSerializer(serializers.ModelSerializer):
    # Expose the status lookup FK as its name ("Online", "Offline", ...).
    status = serializers.SlugRelatedField(
        slug_field="name",
        queryset=CameraStatus.objects.all(),
        required=False,
    )

    class Meta:
        model = Camera
        fields = [
            "id", "name", "stream_url", "stream_type", "location_name",
            "is_active", "status", "last_seen", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_seen", "created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        name = (value or "").strip()
        qs = Camera.objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A camera with this name already exists."
            )
        return name


class CameraStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[])
    last_seen = serializers.DateTimeField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["status"].choices = list(
            CameraStatus.objects.values_list("name", flat=True)
        )

    def validate_status(self, value: str) -> str:
        valid = list(CameraStatus.objects.values_list("name", flat=True))
        if value not in valid:
            raise serializers.ValidationError(f"Invalid status: {value}")
        return value
