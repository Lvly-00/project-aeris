from django.db import models


class AIConfiguration(models.Model):
    class ModelChoice(models.TextChoices):
        YOLO11N = "yolo11n.pt", "YOLO11 Nano"
        YOLO11S = "yolo11s.pt", "YOLO11 Small"
        YOLO11M = "yolo11m.pt", "YOLO11 Medium"

    global_confidence_threshold = models.FloatField(default=0.3)
    fire_threshold = models.FloatField(default=0.4)
    smoke_threshold = models.FloatField(default=0.35)
    accident_threshold = models.FloatField(default=0.35)
    detection_interval_ms = models.IntegerField(default=2000)
    model_name = models.CharField(
        max_length=20, choices=ModelChoice.choices, default=ModelChoice.YOLO11N
    )
    enable_sound_alerts = models.BooleanField(default=True)
    enable_push_notifications = models.BooleanField(default=True)
    auto_create_incidents = models.BooleanField(default=True)
    dedup_window_minutes = models.IntegerField(default=10)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI Configuration"
        verbose_name_plural = "AI Configuration"

    def __str__(self) -> str:
        return f"AI Config (conf={self.global_confidence_threshold})"

    @classmethod
    def get_config(cls):
        config, _ = cls.objects.get_or_create(pk=1)
        return config
