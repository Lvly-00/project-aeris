from django.contrib import admin
from .models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = [
        "incident_type", "severity", "status", "camera",
        "confidence_score", "detected_at",
    ]
    list_filter = ["incident_type", "severity", "status"]
    search_fields = ["description", "incident_type__name"]
    date_hierarchy = "detected_at"
