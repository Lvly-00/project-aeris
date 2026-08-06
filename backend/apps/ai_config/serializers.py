from rest_framework import serializers
from .models import AIConfiguration


class AIConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConfiguration
        exclude = []
