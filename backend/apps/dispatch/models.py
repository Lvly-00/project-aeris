from django.db import models
from django.conf import settings


class Dispatcher(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "Available", "Available"
        EN_ROUTE = "En_Route", "En Route"
        ON_SCENE = "On_Scene", "On Scene"
        UNAVAILABLE = "Unavailable", "Unavailable"

    class DispatcherType(models.TextChoices):
        BARANGAY_TANOD = "Barangay_Tanod", "Barangay Tanod"
        BARANGAY_OFFICIAL = "Barangay_Official", "Barangay Official"
        MDRRMO = "MDRRMO", "MDRRMO"
        BFP = "BFP", "BFP"
        PNP = "PNP", "PNP"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dispatcher_profile",
    )
    dispatcher_type = models.CharField(
        max_length=30, choices=DispatcherType.choices,
        default=DispatcherType.BARANGAY_TANOD,
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.AVAILABLE
    )
    phone_number = models.CharField(max_length=20, blank=True, default="")
    zone = models.ForeignKey(
        "zones.Zone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispatchers",
    )
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dispatcher"
        verbose_name_plural = "Dispatchers"
        ordering = ["dispatcher_type", "user__username"]

    def __str__(self) -> str:
        return f"{self.get_dispatcher_type_display()} - {self.user.get_full_name() or self.user.username}"


class Dispatch(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        ACCEPTED = "Accepted", "Accepted"
        EN_ROUTE = "En_Route", "En Route"
        ON_SCENE = "On_Scene", "On Scene"
        COMPLETED = "Completed", "Completed"
        REJECTED = "Rejected", "Rejected"
        CANCELLED = "Cancelled", "Cancelled"

    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="dispatches",
    )
    dispatcher = models.ForeignKey(
        Dispatcher,
        on_delete=models.CASCADE,
        related_name="dispatches",
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.PENDING
    )
    dispatched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispatches_initiated",
    )
    notes = models.TextField(blank=True, default="")
    accepted_at = models.DateTimeField(null=True, blank=True)
    en_route_at = models.DateTimeField(null=True, blank=True)
    on_scene_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dispatch"
        verbose_name_plural = "Dispatches"
        ordering = ["-created_at"]
        unique_together = ["incident", "dispatcher"]

    def __str__(self) -> str:
        return f"{self.dispatcher} -> {self.incident} [{self.status}]"


class IncidentTimeline(models.Model):
    class EventType(models.TextChoices):
        DETECTED = "Detected", "Detected"
        VERIFIED = "Verified", "Verified"
        DISPATCHED = "Dispatched", "Dispatched"
        DISPATCH_ACCEPTED = "Dispatch_Accepted", "Dispatch Accepted"
        DISPATCH_EN_ROUTE = "Dispatch_En_Route", "Dispatch En Route"
        DISPATCH_ON_SCENE = "Dispatch_On_Scene", "Dispatch On Scene"
        DISPATCH_COMPLETED = "Dispatch_Completed", "Dispatch Completed"
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
