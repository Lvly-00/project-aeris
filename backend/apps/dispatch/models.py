from django.db import models
from django.conf import settings


class DispatchMessage(models.Model):
    """
    A dispatch message sent to Barangay Tanods when an incident is dispatched.

    `recipient` is optional; when NULL the message is broadcast to all tanods.
    """
    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="dispatch_messages",
    )
    title = models.CharField(max_length=300)
    body = models.TextField()
    dispatched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispatch_messages_sent",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dispatch_messages",
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Dispatch Message"
        verbose_name_plural = "Dispatch Messages"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} [{self.created_at}]"


class IncidentTimeline(models.Model):
    class EventType(models.TextChoices):
        DETECTED = "Detected", "Detected"
        VERIFIED = "Verified", "Verified"
        DISPATCHED = "Dispatched", "Dispatched"
        RESPONDING = "Responding", "Responding"
        RESOLVED = "Resolved", "Resolved"
        ARCHIVED = "Archived", "Archived"
        DISMISSED = "Dismissed", "Dismissed"
        NOTE_ADDED = "Note_Added", "Note Added"
        EVIDENCE_ADDED = "Evidence_Added", "Evidence Added"
        SEVERITY_CHANGED = "Severity_Changed", "Severity Changed"
        ESCALATED = "Escalated", "Escalated"

    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="timeline_entries",
    )
    event_type = models.CharField(max_length=25, choices=EventType.choices)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_actions",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Incident Timeline Entry"
        verbose_name_plural = "Incident Timeline Entries"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.event_type}: {self.title}"
