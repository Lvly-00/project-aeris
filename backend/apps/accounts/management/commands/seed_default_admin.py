from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.ai_config.models import AIConfiguration

User = get_user_model()

DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"
DEFAULT_EMAIL = "admin@barangay.local"
DEFAULT_ROLE = "Admin"


class Command(BaseCommand):
    help = "Creates a default admin user if no users exist, and ensures AI config exists"

    def handle(self, *args, **options):
        AIConfiguration.objects.get_or_create(pk=1)
        self.stdout.write("AI configuration initialized")

        admin = User.objects.filter(username=DEFAULT_USERNAME).first()
        if admin:
            if admin.role != DEFAULT_ROLE:
                admin.role = DEFAULT_ROLE
                admin.save(update_fields=["role"])
                self.stdout.write(self.style.SUCCESS(f"Updated admin role to {DEFAULT_ROLE}"))
            else:
                self.stdout.write("Admin user already has correct role")
            return

        if User.objects.exists():
            self.stdout.write("Users exist but no admin user found, skipping")
            return

        User.objects.create_superuser(
            username=DEFAULT_USERNAME,
            email=DEFAULT_EMAIL,
            password=DEFAULT_PASSWORD,
            role=DEFAULT_ROLE,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Created default admin — username: {DEFAULT_USERNAME}, password: {DEFAULT_PASSWORD}"
        ))
