from django.db import models
from django.conf import settings


class Incident(models.Model):
    class Severity(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        CRITICAL = "Critical", "Critical"

    class Source(models.TextChoices):
        AI = "ai", "AI Detection"
        SIMULATION = "simulation", "Simulation"
        MANUAL = "manual", "Manual"

    incident_type = models.ForeignKey(
        "lookups.IncidentType",
        on_delete=models.PROTECT,
        related_name="incidents",
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM
    )
    status = models.ForeignKey(
        "lookups.IncidentStatus",
        on_delete=models.PROTECT,
        related_name="incidents",
    )
    camera = models.ForeignKey(
        "cameras.Camera",
        # An incident is meaningless without the camera that raised it: its
        # detections, snapshots and location all belong to that camera. This
        # used to be SET_NULL, which left camera-less incidents behind that
        # still counted on the dashboard but could not be acted on.
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="incidents",
    )
    confidence_score = models.FloatField(default=0.0)
    description = models.TextField(blank=True, default="")
    detected_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_incidents",
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_incidents",
    )
    dismissed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dismissed_incidents",
    )
    evidence_image = models.ImageField(
        upload_to="evidence/", blank=True, null=True
    )
    evidence_gallery = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    duration = models.CharField(max_length=50, blank=True, default="")
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.MANUAL
    )
    # Number of AI detections folded into this incident. Repeat detections for a
    # camera increment the counter on the open incident instead of creating a new
    # one, so operators only get a single alert per ongoing incident.
    detection_count = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Incident"
        verbose_name_plural = "Incidents"
        ordering = ["-detected_at"]

    def __str__(self) -> str:
        return f"{self.incident_type} - {self.status} [{self.detected_at}]"
