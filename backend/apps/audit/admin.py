from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "resource_type", "resource_id", "created_at"]
    list_filter = ["action", "created_at"]
    search_fields = ["action", "user__username", "resource_type"]
    date_hierarchy = "created_at"
    readonly_fields = ["user", "action", "resource_type", "resource_id", "details", "ip_address", "user_agent", "created_at"]
