import logging
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()
logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    # Added these to support the Profile UI
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name",
            "role", "role_display", "phone_number", "barangay_zone", 
            "is_active", "date_joined",
        ]
        read_only_fields = ["id", "is_active", "date_joined", "role_display"]

    def get_full_name(self, obj):
        # Returns "Juan Dela Cruz" or just the username if names are empty
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "username", "email", "password", "password2",
            "first_name", "last_name", "role", "phone_number",
            "barangay_zone",
        ]

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value: str) -> str:
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already in use.")
        return value

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        logger.info("Created user %s with role %s", user.username, user.role)
        return user



class VerifyPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user

        # Debugging: This will print to your Django terminal
        print(f"Verifying password for user: {user}") 

        if not user or user.is_anonymous:
            raise serializers.ValidationError("Session expired. Please log in again.")

        if not user.check_password(attrs.get('password')):
            # Logic: user.check_password hashes the input and compares it to the DB
            raise serializers.ValidationError("Incorrect password.")
            
        return attrs

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        user = authenticate(
            username=attrs.get("username"),
            password=attrs.get("password"),
        )
        if user is None:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled.")
        attrs["user"] = user
        return attrs
