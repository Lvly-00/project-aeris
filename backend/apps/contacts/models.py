from django.db import models


class EmergencyContact(models.Model):
    class IncidentType(models.TextChoices):
        FIRE = "Fire", "Fire"
        SMOKE = "Smoke", "Smoke"
        VEHICLE_ACCIDENT = "Vehicle_Accident", "Vehicle Accident"
        GENERAL = "General", "General Emergency"

    name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=50)
    incident_type = models.CharField(
        max_length=30, choices=IncidentType.choices, default=IncidentType.GENERAL,
    )
    zone = models.ForeignKey(
        "zones.Zone", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="emergency_contacts",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Emergency Contact"
        verbose_name_plural = "Emergency Contacts"
        ordering = ["incident_type", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.phone_number})"
