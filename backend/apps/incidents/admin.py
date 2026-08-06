from django.contrib import admin
from .models import Incident


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = [
        "incident_type", "severity", "status", "camera", "zone",
        "confidence_score", "detected_at",
    ]
    list_filter = ["incident_type", "severity", "status", "zone"]
    search_fields = ["description", "incident_type"]
    date_hierarchy = "detected_at"
