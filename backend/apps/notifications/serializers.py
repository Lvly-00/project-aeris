import logging
from rest_framework import serializers
from .models import Notification

logger = logging.getLogger(__name__)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "incident", "title", "message", "notification_type",
            "priority", "is_read", "recipient", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class NotificationMarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    all = serializers.BooleanField(default=False)
