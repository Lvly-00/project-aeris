import logging
from datetime import timedelta
from django.db.models import Count, Avg, Q, F, FloatField, ExpressionWrapper
from django.db.models.functions import TruncHour, TruncDate
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.incidents.models import Incident
from apps.cameras.models import Camera
from .serializers import AnalyticsQuerySerializer

logger = logging.getLogger(__name__)


class AnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return AnalyticsQuerySerializer

    def _get_base_queryset(self, request):
        qs = Incident.objects.all()
        serializer = AnalyticsQuerySerializer(data=request.query_params)
        if serializer.is_valid():
            data = serializer.validated_data
            if data.get("date_from"):
                qs = qs.filter(detected_at__gte=data["date_from"])
            if data.get("date_to"):
                qs = qs.filter(detected_at__lte=data["date_to"])
            if data.get("zone"):
                qs = qs.filter(zone_id=data["zone"])
            if data.get("incident_type"):
                qs = qs.filter(incident_type=data["incident_type"])
        return qs

    @action(detail=False, methods=["get"], url_path="incident-summary")
    def incident_summary(self, request) -> Response:
        qs = self._get_base_queryset(request)
        total = qs.count()
        total_field = request.query_params.get("total", "false").lower() == "true"
        resp = {
            "total": total,
            "by_type": list(qs.values("incident_type").annotate(
                count=Count("id")
            ).order_by("incident_type")),
            "by_severity": list(qs.values("severity").annotate(
                count=Count("id")
            ).order_by("severity")),
            "by_status": list(qs.values("status").annotate(
                count=Count("id")
            ).order_by("status")),
        }
        return Response(resp)

    @action(detail=False, methods=["get"], url_path="high-risk-locations")
    def high_risk_locations(self, request) -> Response:
        qs = self._get_base_queryset(request)
        top = qs.values(
            "camera__id", "camera__name", "camera__latitude",
            "camera__longitude", "camera__location_name",
        ).annotate(
            incident_count=Count("id")
        ).order_by("-incident_count")[:10]
        result = []
        for item in top:
            result.append({
                "camera_id": item["camera__id"],
                "camera_name": item["camera__name"],
                "latitude": item["camera__latitude"],
                "longitude": item["camera__longitude"],
                "location_name": item["camera__location_name"],
                "incident_count": item["incident_count"],
            })
        return Response(result)

    @action(detail=False, methods=["get"], url_path="peak-hours")
    def peak_hours(self, request) -> Response:
        qs = self._get_base_queryset(request)
        hours = qs.annotate(
            hour=TruncHour("detected_at")
        ).values("hour").annotate(
            count=Count("id")
        ).order_by("hour")
        result = []
        for h in hours:
            h_val = h["hour"]
            result.append({
                "hour": h_val.hour if h_val else 0,
                "count": h["count"],
            })
        return Response(result)

    @action(detail=False, methods=["get"], url_path="response-times")
    def response_times(self, request) -> Response:
        qs = Incident.objects.filter(
            responded_at__isnull=False,
            detected_at__isnull=False,
        )
        serializer = AnalyticsQuerySerializer(data=request.query_params)
        if serializer.is_valid():
            data = serializer.validated_data
            if data.get("date_from"):
                qs = qs.filter(detected_at__gte=data["date_from"])
            if data.get("date_to"):
                qs = qs.filter(detected_at__lte=data["date_to"])
            if data.get("incident_type"):
                qs = qs.filter(incident_type=data["incident_type"])

        avg_times = qs.annotate(
            response_time=ExpressionWrapper(
                F("responded_at") - F("detected_at"),
                output_field=FloatField(),
            )
        ).values("incident_type").annotate(
            avg_response_seconds=Avg(
                ExpressionWrapper(
                    F("responded_at") - F("detected_at"),
                    output_field=FloatField(),
                )
            ),
            count=Count("id"),
        ).order_by("incident_type")

        result = []
        for item in avg_times:
            avg_secs = item.get("avg_response_seconds")
            result.append({
                "incident_type": item["incident_type"],
                "avg_response_time": round(avg_secs, 2) if avg_secs else None,
                "count": item["count"],
            })
        return Response(result)

    @action(detail=False, methods=["get"], url_path="severity-distribution")
    def severity_distribution(self, request) -> Response:
        qs = self._get_base_queryset(request)
        dist = list(qs.values("severity").annotate(
            count=Count("id")
        ).order_by("severity"))
        return Response(dist)

    @action(detail=False, methods=["get"], url_path="trend-analysis")
    def trend_analysis(self, request) -> Response:
        qs = self._get_base_queryset(request)
        trends = list(qs.annotate(
            date=TruncDate("detected_at")
        ).values("date").annotate(
            count=Count("id")
        ).order_by("date"))
        return Response(trends)

    @action(detail=False, methods=["get"], url_path="heatmap-data")
    def heatmap_data(self, request) -> Response:
        qs = self._get_base_queryset(request).filter(
            location_lat__isnull=False,
            location_lng__isnull=False,
        )
        data = qs.values(
            "id", "incident_type", "severity", "location_lat",
            "location_lng", "detected_at",
        )[:500]
        return Response(data)

    def list(self, request, *args, **kwargs) -> Response:
        return Response(
            {"error": "Use specific analytics endpoints."},
            status=status.HTTP_400_BAD_REQUEST,
        )
