from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    # "username" keeps the actor's display name (full name, falling back to
    # email) for API compatibility; "user_role" carries the actor's role.
    username = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "username", "user_role", "profile_picture", "action",
            "resource_type", "resource_id", "details", "ip_address", "user_agent",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_username(self, obj):
        if obj.user is None:
            return "System"
        return obj.user.get_full_name() or obj.user.email

    def get_user_role(self, obj):
        if obj.user is None or not obj.user.role_id:
            return ""
        return obj.user.role.name

    def get_profile_picture(self, obj):
        if obj.user is None:
            return None
        picture = obj.user.profile_picture
        return picture.url if picture else None
