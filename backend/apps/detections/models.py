from django.db import models


class Detection(models.Model):
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
    incident_type = models.CharField(max_length=30)
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
    is_verified = models.BooleanField(default=False)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Detection"
        verbose_name_plural = "Detections"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.incident_type} ({self.confidence_score:.2f}) @ {self.frame_timestamp or self.created_at}"
