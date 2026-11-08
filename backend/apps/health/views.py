"""
Liveness endpoint for the load balancer, the compose health check and the
deploy script. Deliberately unauthenticated and unthrottled: it returns no
data beyond whether the process can reach its database.

Keep this file free of model imports — it runs before anything else in a
health probe and must stay cheap.
"""
import logging

from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []
    http_method_names = ["get"]

    def get(self, request) -> Response:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            logger.exception("Health check: database unreachable")
            return Response(
                {"status": "error", "database": "unavailable"},
                status=503,
            )

        return Response({"status": "ok", "database": "ok"})
