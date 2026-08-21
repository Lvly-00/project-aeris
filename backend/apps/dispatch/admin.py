from django.contrib import admin
from .models import DispatchMessage, IncidentTimeline


@admin.register(DispatchMessage)
class DispatchMessageAdmin(admin.ModelAdmin):
    list_display = ["title", "incident", "dispatched_by", "recipient", "is_read", "created_at"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["title", "body"]


@admin.register(IncidentTimeline)
class IncidentTimelineAdmin(admin.ModelAdmin):
    list_display = ["incident", "event_type", "title", "actor", "created_at"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["title", "description"]
    date_hierarchy = "created_at"
