from django.contrib import admin
from .models import Camera


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "is_active", "last_seen", "created_at"]
    list_filter = ["status", "is_active", "stream_type"]
    search_fields = ["name", "location_name", "stream_url"]
