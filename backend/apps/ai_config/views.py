import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsAdmin
from .models import AIConfiguration
from .serializers import AIConfigurationSerializer

logger = logging.getLogger(__name__)


class AIConfigurationViewSet(viewsets.GenericViewSet):
    queryset = AIConfiguration.objects.all()
    serializer_class = AIConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        config = AIConfiguration.get_config()
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    def update(self, request, pk=None):
        config = AIConfiguration.get_config()
        serializer = self.get_serializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info("AI configuration updated by %s", request.user.username)
        return Response(serializer.data)

    @action(detail=False, methods=["get", "patch"], url_path="settings")
    def config_settings(self, request):
        config = AIConfiguration.get_config()
        if request.method == "PATCH":
            serializer = self.get_serializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(config)
        return Response(serializer.data)
