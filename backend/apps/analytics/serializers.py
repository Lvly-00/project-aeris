from rest_framework import serializers


class AnalyticsQuerySerializer(serializers.Serializer):
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    incident_type = serializers.CharField(required=False)
