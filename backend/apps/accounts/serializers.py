import logging
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

from apps.lookups.models import Role

User = get_user_model()
logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(
        slug_field="name",
        queryset=Role.objects.all(),
    )
    role_display = serializers.CharField(source="role.name", read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name", "password",
            "role", "role_display",
            "is_active", "created_at", "profile_picture",
            "two_factor_enabled", "receive_notifications", "preferred_language",
        ]
        read_only_fields = ["id", "is_active", "created_at", "role_display"]
        extra_kwargs = {
            "password": {"write_only": True, "required": False}
        }

    def get_full_name(self, obj):
        # Returns "Juan Dela Cruz" or just the email if names are empty
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.email

    def update(self, instance, validated_data):
        # 1. Catch the password and hash it properly
        password = validated_data.pop("password", None)

        # 2. Update all other fields automatically
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # 3. If a password was provided, use set_password to HASH it
        if password:
            instance.set_password(password)

        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.SlugRelatedField(
        slug_field="name",
        queryset=Role.objects.all(),
    )
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "email", "password", "password2",
            "first_name", "last_name", "role",
        ]

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def validate_email(self, value: str) -> str:
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already in use.")
        return value

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        logger.info("Created user %s with role %s", user.email, user.role)
        return user


class VerifyPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user

        if not user or user.is_anonymous:
            raise serializers.ValidationError("Session expired. Please log in again.")

        if not user.check_password(attrs.get("password")):
            raise serializers.ValidationError("Incorrect password.")

        return attrs


class LoginSerializer(serializers.Serializer):
    """
    Validates the SHAPE of login credentials only. Actual authentication
    (including lockout / progressive delay / audit logging) is handled by
    the login view so failed attempts are always recorded.
    """
    email = serializers.EmailField(
        error_messages={
            "required": "Email Address is required.",
            "blank": "Email Address is required.",
        }
    )
    password = serializers.CharField(
        write_only=True,
        error_messages={
            "required": "Password is required.",
            "blank": "Password is required.",
        },
    )

    def validate(self, attrs: dict) -> dict:
        return attrs


class PasswordResetVerifySerializer(serializers.Serializer):
    """Shape validation for the verification-code step."""

    email = serializers.EmailField(
        error_messages={
            "required": "Email Address is required.",
            "blank": "Email Address is required.",
        }
    )
    code = serializers.RegexField(
        r"^\d{6}$",
        error_messages={
            "required": "Verification code is required.",
            "invalid": "Enter the 6-digit verification code.",
        },
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Shape validation for setting the new password."""

    email = serializers.EmailField(
        error_messages={
            "required": "Email Address is required.",
            "blank": "Email Address is required.",
        }
    )
    code = serializers.RegexField(
        r"^\d{6}$",
        error_messages={
            "required": "Verification code is required.",
            "invalid": "Enter the 6-digit verification code.",
        },
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "required": "Password is required.",
            "blank": "Password is required.",
            "min_length": "Password must be at least 8 characters.",
        },
    )
