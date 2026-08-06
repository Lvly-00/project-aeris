from django.contrib import admin
from .models import Recommendation


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = [
        "incident", "responder_type", "suggested_action", "priority",
        "confidence_score", "is_accepted", "created_at",
    ]
    list_filter = ["responder_type", "suggested_action", "priority", "is_accepted"]
    search_fields = ["explanation", "reasoning"]
