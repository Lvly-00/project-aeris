from django.contrib import admin
from .models import Detection


@admin.register(Detection)
class DetectionAdmin(admin.ModelAdmin):
    list_display = [
        "incident_type", "confidence_score", "camera", "is_verified",
        "processed", "frame_timestamp", "created_at",
    ]
    list_filter = ["incident_type", "is_verified", "processed", "camera"]
    search_fields = ["incident_type"]
