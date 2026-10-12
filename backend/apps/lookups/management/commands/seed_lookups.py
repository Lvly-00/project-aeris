from django.core.management.base import BaseCommand

from apps.lookups.models import (
    CameraStatus,
    IncidentStatus,
    IncidentType,
    NotificationType,
    Role,
)

ROLES = ["CCTV Chief", "CCTV Operator", "Barangay Tanod"]
INCIDENT_TYPES = ["Fire", "Smoke", "Vehicle_Accident"]
INCIDENT_STATUSES = ["Detected", "Verified", "Dispatched", "Resolved", "Dismissed"]
CAMERA_STATUSES = ["Online", "Offline", "Connecting", "Error"]
NOTIFICATION_TYPES = ["Alert", "Warning", "Info"]


class Command(BaseCommand):
    help = "Idempotently ensure the lookup tables (roles, types, statuses) are populated."

    def handle(self, *args, **options):
        created = 0
        for model, names in (
            (Role, ROLES),
            (IncidentType, INCIDENT_TYPES),
            (IncidentStatus, INCIDENT_STATUSES),
            (CameraStatus, CAMERA_STATUSES),
            (NotificationType, NOTIFICATION_TYPES),
        ):
            for name in names:
                _, was_created = model.objects.get_or_create(name=name)
                created += int(was_created)

        self.stdout.write(self.style.SUCCESS(f"Lookups seeded ({created} created)"))
