from django.contrib import admin
from .models import AIConfiguration


@admin.register(AIConfiguration)
class AIConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        "global_confidence_threshold", "model_name",
        "detection_interval_ms", "enable_sound_alerts",
        "auto_create_incidents", "updated_at",
    ]
