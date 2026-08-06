from django.contrib import admin
from .models import Dispatcher, Dispatch, IncidentTimeline


@admin.register(Dispatcher)
class DispatcherAdmin(admin.ModelAdmin):
    list_display = ["user", "dispatcher_type", "status", "zone", "is_active"]
    list_filter = ["dispatcher_type", "status", "zone", "is_active"]
    search_fields = ["user__username", "user__first_name", "user__last_name", "phone_number"]


@admin.register(Dispatch)
class DispatchAdmin(admin.ModelAdmin):
    list_display = ["incident", "dispatcher", "status", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["incident__description", "dispatcher__user__username"]
    date_hierarchy = "created_at"


@admin.register(IncidentTimeline)
class IncidentTimelineAdmin(admin.ModelAdmin):
    list_display = ["incident", "event_type", "title", "actor", "created_at"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["title", "description"]
    date_hierarchy = "created_at"
