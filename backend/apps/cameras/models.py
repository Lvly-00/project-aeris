from django.db import models


class Camera(models.Model):
    class StreamType(models.TextChoices):
        RTSP = "RTSP", "RTSP"
        HTTP = "HTTP", "HTTP"
        MP4 = "MP4", "MP4"
        EMBED = "EMBED", "EMBED"

    class Status(models.TextChoices):
        ONLINE = "Online", "Online"
        OFFLINE = "Offline", "Offline"
        ERROR = "Error", "Error"

    name = models.CharField(max_length=200)
    rtsp_url = models.CharField(max_length=500)
    stream_type = models.CharField(
        max_length=10, choices=StreamType.choices, default=StreamType.RTSP
    )
    location_name = models.CharField(max_length=300, blank=True, default="")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    zone = models.ForeignKey(
        "zones.Zone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cameras",
    )
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.OFFLINE
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
