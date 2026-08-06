from django.contrib import admin
from .models import Zone


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ["name", "barangay", "created_at"]
    list_filter = ["barangay"]
    search_fields = ["name", "barangay"]
