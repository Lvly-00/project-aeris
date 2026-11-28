from django.db import models
from django.conf import settings


class PushSubscription(models.Model):
    """
    Stores a Web Push subscription endpoint + keys for a user's browser/PWA.
    One user can have multiple subscriptions (different devices/browsers).
    The (user, endpoint) pair is unique so re-subscribing the same device
    upserts rather than duplicates.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
    )
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()   # client public key
    auth = models.TextField()     # client auth secret
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Push subscription"
        verbose_name_plural = "Push subscriptions"

    def __str__(self) -> str:
        return f"PushSubscription({self.user_id}, {self.endpoint[:60]}…)"


class Notification(models.Model):
    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        CRITICAL = "Critical", "Critical"

    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    title = models.CharField(max_length=300)
    message = models.TextField()
    notification_type = models.ForeignKey(
        "lookups.NotificationType",
        on_delete=models.PROTECT,
        related_name="notifications",
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    is_read = models.BooleanField(default=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
