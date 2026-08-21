from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.ai_config.models import AIConfiguration
from apps.lookups.models import Role

User = get_user_model()

DEFAULT_EMAIL = "admin@barangay.local"
DEFAULT_PASSWORD = "admin123"
DEFAULT_ROLE = "CCTV Chief"


class Command(BaseCommand):
    help = "Creates a default admin user if no users exist, and ensures AI config exists"

    def handle(self, *args, **options):
        AIConfiguration.objects.get_or_create(pk=1)
        self.stdout.write("AI configuration initialized")

        for role_name in ["CCTV Chief", "CCTV Operator", "Barangay Tanod"]:
            Role.objects.get_or_create(name=role_name)

        admin = User.objects.filter(email__iexact=DEFAULT_EMAIL).first()
        if admin:
            if not admin.role or admin.role.name != DEFAULT_ROLE:
                admin.role = Role.objects.get(name=DEFAULT_ROLE)
                admin.save(update_fields=["role"])
                self.stdout.write(self.style.SUCCESS(f"Updated admin role to {DEFAULT_ROLE}"))
            else:
                self.stdout.write("Admin user already has correct role")
            return

        if User.objects.exists():
            self.stdout.write("Users exist but no admin user found, skipping")
            return

        User.objects.create_superuser(
            email=DEFAULT_EMAIL,
            password=DEFAULT_PASSWORD,
            first_name="System",
            last_name="Administrator",
            role=Role.objects.get(name=DEFAULT_ROLE),
        )
        self.stdout.write(self.style.SUCCESS(
            f"Created default admin — email: {DEFAULT_EMAIL}, password: {DEFAULT_PASSWORD}"
        ))
