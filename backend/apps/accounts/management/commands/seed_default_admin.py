from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.ai_config.models import AIConfiguration
from apps.lookups.models import Role

User = get_user_model()

DEFAULT_EMAIL = "lovelypintes@gmail.com"
DEFAULT_PASSWORD = "admin123"
DEFAULT_ROLE = "CCTV Chief"

# Additional chief/admin accounts that must always exist. Seeded on every
# deploy (see backend/Dockerfile CMD) so they are present in the deployed DB.
# Tuple: (first_name, last_name, email)
EXTRA_ADMINS = [
    ("Ellissea", "Montes", "montes.ellissea.pasillos@gmail.com"),
    ("Jocelyn", "Bendoy", "jocelynbendoy26@gmail.com"),
    ("Allain Francois", "Dungca", "allainfrancoisdungca@student.laverdad.edu.ph"),
]


class Command(BaseCommand):
    help = (
        "Creates a default admin user if no users exist, ensures the extra "
        "admin accounts, and ensures AI config exists"
    )

    def handle(self, *args, **options):
        AIConfiguration.objects.get_or_create(pk=1)
        self.stdout.write("AI configuration initialized")

        for role_name in ["CCTV Chief", "CCTV Operator", "Barangay Tanod"]:
            Role.objects.get_or_create(name=role_name)

        chief_role = Role.objects.get(name=DEFAULT_ROLE)

        self._seed_default_admin(chief_role)
        self._seed_extra_admins(chief_role)

    def _seed_default_admin(self, chief_role):
        admin = User.objects.filter(email__iexact=DEFAULT_EMAIL).first()
        if admin:
            if not admin.role or admin.role.name != DEFAULT_ROLE:
                admin.role = chief_role
                admin.save(update_fields=["role"])
                self.stdout.write(self.style.SUCCESS(f"Updated admin role to {DEFAULT_ROLE}"))
            else:
                self.stdout.write("Admin user already has correct role")
            return

        if User.objects.exists():
            self.stdout.write("Users exist but no default admin user found, skipping")
            return

        User.objects.create_superuser(
            email=DEFAULT_EMAIL,
            password=DEFAULT_PASSWORD,
            first_name="System",
            last_name="Administrator",
            role=chief_role,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Created default admin — email: {DEFAULT_EMAIL}, password: {DEFAULT_PASSWORD}"
        ))

    def _seed_extra_admins(self, chief_role):
        """Ensure each extra admin exists with the chief role and password."""
        for first_name, last_name, email in EXTRA_ADMINS:
            user = User.objects.filter(email__iexact=email).first()

            if user is None:
                User.objects.create_superuser(
                    email=email,
                    password=DEFAULT_PASSWORD,
                    first_name=first_name,
                    last_name=last_name,
                    role=chief_role,
                )
                self.stdout.write(self.style.SUCCESS(
                    f"Created admin account — email: {email}, password: {DEFAULT_PASSWORD}"
                ))
                continue

            changed = []
            if user.role_id != chief_role.id:
                user.role = chief_role
                changed.append("role")
            if not user.is_staff:
                user.is_staff = True
                changed.append("is_staff")
            if not user.is_superuser:
                user.is_superuser = True
                changed.append("is_superuser")
            if not user.check_password(DEFAULT_PASSWORD):
                user.set_password(DEFAULT_PASSWORD)
                changed.append("password")

            if changed:
                user.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Updated admin account {email}: {', '.join(changed)}"
                ))
            else:
                self.stdout.write(f"Admin account already present: {email}")
