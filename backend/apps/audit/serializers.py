from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    # Kept the "username" key for API compatibility; it now carries
    # the actor's email since users are identified by email only.
    username = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "username", "action", "resource_type", "resource_id",
            "details", "ip_address", "user_agent", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
