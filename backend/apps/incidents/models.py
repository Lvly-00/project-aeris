from django.db import models
from django.conf import settings


class Incident(models.Model):
    class IncidentType(models.TextChoices):
        FIRE = "Fire", "Fire"
        SMOKE = "Smoke", "Smoke"
        VEHICLE_ACCIDENT = "Vehicle_Accident", "Vehicle Accident"

    class Severity(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        CRITICAL = "Critical", "Critical"

    class Status(models.TextChoices):
        DETECTED = "Detected", "Detected"
        PENDING_VERIFICATION = "Pending_Verification", "Pending Verification"
        VERIFIED = "Verified", "Verified"
        DISPATCHED = "Dispatched", "Dispatched"
        RESPONDING = "Responding", "Responding"
        RESOLVED = "Resolved", "Resolved"
        ARCHIVED = "Archived", "Archived"
        DISMISSED = "Dismissed", "Dismissed"
        FALSE_POSITIVE = "False_Positive", "False Positive"

    incident_type = models.CharField(
        max_length=30, choices=IncidentType.choices
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DETECTED
    )
    camera = models.ForeignKey(
        "cameras.Camera",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    zone = models.ForeignKey(
        "zones.Zone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    confidence_score = models.FloatField(default=0.0)
    description = models.TextField(blank=True, default="")
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
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
    updated_at = models.DateTimeField(auto_now=True)
    duration = models.DurationField(null=True, blank=True)
    crowd_size = models.IntegerField(null=True, blank=True)
    review_notes = models.TextField(blank=True, default="")
    escalated_to = models.CharField(max_length=30, blank=True, default="")

    class Meta:
        verbose_name = "Incident"
        verbose_name_plural = "Incidents"
        ordering = ["-detected_at"]

    def __str__(self) -> str:
        return f"{self.incident_type} - {self.status} [{self.detected_at}]"
