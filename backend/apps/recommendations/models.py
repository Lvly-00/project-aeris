from django.db import models
from django.conf import settings


class Recommendation(models.Model):
    class ResponderType(models.TextChoices):
        BARANGAY_TANOD = "Barangay_Tanod", "Barangay Tanod"
        BARANGAY_OFFICIAL = "Barangay_Official", "Barangay Official"
        MDRRMO = "MDRRMO", "MDRRMO"
        BFP = "BFP", "BFP"
        PNP = "PNP", "PNP"

    class SuggestedAction(models.TextChoices):
        VERIFY_INCIDENT = "Verify_Incident", "Verify Incident"
        DISPATCH_RESPONDERS = "Dispatch_Responders", "Dispatch Responders"
        ROAD_CLEARING = "Road_Clearing", "Road Clearing"
        EVACUATION = "Evacuation", "Evacuation"
        EMERGENCY_ESCALATION = "Emergency_Escalation", "Emergency Escalation"
        CONTINUE_MONITORING = "Continue_Monitoring", "Continue Monitoring"

    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        CRITICAL = "Critical", "Critical"

    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="recommendations",
    )
    responder_type = models.CharField(
        max_length=30, choices=ResponderType.choices
    )
    suggested_action = models.CharField(
        max_length=30, choices=SuggestedAction.choices
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    explanation = models.TextField(blank=True, default="")
    confidence_score = models.FloatField(default=0.0)
    reasoning = models.TextField(blank=True, default="")
    is_accepted = models.BooleanField(null=True, blank=True)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accepted_recommendations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Recommendation"
        verbose_name_plural = "Recommendations"
        ordering = ["-priority", "-confidence_score", "-created_at"]

    def __str__(self) -> str:
        return f"{self.responder_type}: {self.suggested_action} [{self.priority}]"
