from django.conf import settings
from django.db import models
from django.utils import timezone


class Detection(models.Model):
    """
    A single hit produced by the AI model. Every re-detection of an ongoing
    incident is stored as its own row so an operator can review them one by
    one and mark each as a real incident or a false positive.
    """

    class Verdict(models.TextChoices):
        PENDING = "pending", "Pending"
        TRUE = "true", "True incident"
        FALSE = "false", "False positive"

    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="detections",
    )
    camera = models.ForeignKey(
        "cameras.Camera",
        on_delete=models.CASCADE,
        related_name="detections",
    )
    incident_type = models.ForeignKey(
        "lookups.IncidentType",
        on_delete=models.PROTECT,
        related_name="detections",
    )
    confidence_score = models.FloatField(default=0.0)
    bbox_coords = models.JSONField(
        help_text="Bounding box coordinates [x1, y1, x2, y2]",
        default=dict, blank=True,
    )
    fps = models.FloatField(null=True, blank=True)
    frame_timestamp = models.DateTimeField(null=True, blank=True)
    snapshot_image = models.ImageField(
        upload_to="detections/", blank=True, null=True
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="True once a human has reviewed this detection (any verdict).",
    )
    verdict = models.CharField(
        max_length=10,
        choices=Verdict.choices,
        default=Verdict.PENDING,
        help_text="Operator verdict: real incident or false positive.",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_detections",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Detection"
        verbose_name_plural = "Detections"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.incident_type} ({self.confidence_score:.2f}) @ {self.frame_timestamp or self.created_at}"

    def apply_verdict(self, verdict, user=None):
        """Record an operator's check/cross decision on this detection."""
        self.verdict = verdict
        self.is_verified = verdict != self.Verdict.PENDING
        self.reviewed_by = user
        self.reviewed_at = timezone.now() if self.is_verified else None
        self.save(
            update_fields=[
                "verdict", "is_verified", "reviewed_by", "reviewed_at",
            ]
        )
