import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Recommendation
from .serializers import (
    RecommendationSerializer,
    RecommendationCreateSerializer,
    RecommendationActionSerializer,
)

logger = logging.getLogger(__name__)


class RecommendationViewSet(viewsets.ModelViewSet):
    queryset = Recommendation.objects.select_related("incident", "accepted_by").all()
    permission_classes = [IsAuthenticated]
    search_fields = ["responder_type", "suggested_action", "priority"]
    filterset_fields = ["incident", "responder_type", "suggested_action", "priority"]

    def get_queryset(self):
        qs = super().get_queryset()
        is_accepted = self.request.query_params.get("is_accepted")
        if is_accepted == "null":
            qs = qs.filter(is_accepted__isnull=True)
        elif is_accepted is not None:
            qs = qs.filter(is_accepted=is_accepted.lower() == "true")
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return RecommendationCreateSerializer
        return RecommendationSerializer

    @action(detail=True, methods=["post"], url_path="respond")
    def accept_reject(self, request, pk=None) -> Response:
        recommendation = self.get_object()
        serializer = RecommendationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recommendation.is_accepted = serializer.validated_data["is_accepted"]
        recommendation.accepted_by = request.user
        recommendation.save()
        action_word = "accepted" if recommendation.is_accepted else "rejected"
        logger.info(
            "Recommendation %s %s by %s",
            recommendation.id, action_word, request.user.username,
        )
        return Response(RecommendationSerializer(recommendation).data)
