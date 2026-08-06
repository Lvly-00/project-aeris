from django.contrib import admin
from .models import EmergencyContact


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "incident_type", "zone", "is_active"]
    list_filter = ["incident_type", "is_active"]
    search_fields = ["name", "phone_number"]
