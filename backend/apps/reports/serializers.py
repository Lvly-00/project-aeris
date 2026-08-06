import logging
from rest_framework import serializers
from .models import Report

logger = logging.getLogger(__name__)


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id", "title", "report_type", "generated_by",
            "generated_by_name", "date_range_start", "date_range_end",
            "file_pdf", "file_excel", "parameters", "created_at",
            "is_approved", "approved_by", "approved_by_name", "approved_at",
        ]
        read_only_fields = ["id", "generated_by", "created_at", "approved_by", "approved_at"]

    def get_generated_by_name(self, obj: Report) -> str:
        if obj.generated_by:
            return obj.generated_by.get_full_name() or obj.generated_by.username
        return ""

    def get_approved_by_name(self, obj: Report) -> str:
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return ""


class ReportGenerateSerializer(serializers.Serializer):
    report_type = serializers.ChoiceField(choices=Report.ReportType.choices)
    date_range_start = serializers.DateTimeField()
    date_range_end = serializers.DateTimeField()
    title = serializers.CharField(max_length=300, required=False)
    parameters = serializers.JSONField(required=False)

    def validate(self, attrs: dict) -> dict:
        if attrs["date_range_start"] > attrs["date_range_end"]:
            raise serializers.ValidationError(
                "date_range_start must not be after date_range_end."
            )
        return attrs
