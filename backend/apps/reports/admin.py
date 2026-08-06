from django.contrib import admin
from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["title", "report_type", "generated_by", "date_range_start", "date_range_end", "created_at"]
    list_filter = ["report_type"]
    search_fields = ["title"]
