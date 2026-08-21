from django.db import models


class Camera(models.Model):
    class StreamType(models.TextChoices):
        RTSP = "RTSP", "RTSP"
        HTTP = "HTTP", "HTTP"
        MP4 = "MP4", "MP4"
        EMBED = "EMBED", "EMBED"

    name = models.CharField(max_length=200)
    stream_url = models.CharField(max_length=500)
    stream_type = models.CharField(
        max_length=10, choices=StreamType.choices, default=StreamType.RTSP
    )
    location_name = models.CharField(max_length=300, blank=True, default="")
    is_active = models.BooleanField(default=True)
    status = models.ForeignKey(
        "lookups.CameraStatus",
        on_delete=models.PROTECT,
        related_name="cameras",
    )
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Camera"
        verbose_name_plural = "Cameras"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
