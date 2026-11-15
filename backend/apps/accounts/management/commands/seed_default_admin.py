import os

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.ai_config.models import AIConfiguration
from apps.lookups.models import Role

User = get_user_model()

DEFAULT_ROLE = "CCTV Chief"

# ---------------------------------------------------------------------------
# Credentials are sourced exclusively from environment variables so that no
# real email address or password ever appears in source control.
#
# Required env vars (set these in your .env / deployment secrets):
#   ADMIN_EMAIL       – email for the primary system-administrator account
#   ADMIN_PASSWORD    – initial password; must satisfy the project's
#                       ComplexityPasswordValidator rules (8+ chars, upper,
#                       lower, digit, special character)
#
# Optional — extra named admin accounts.  Each entry must supply three vars:
#   EXTRA_ADMIN_{N}_EMAIL, EXTRA_ADMIN_{N}_FIRST_NAME, EXTRA_ADMIN_{N}_LAST_NAME
# where N is a 1-based integer (1, 2, 3, …).  The same ADMIN_PASSWORD is used
# as the *initial* password for newly created extra-admin accounts.
# ---------------------------------------------------------------------------


def _get_required_env(name: str) -> str:
    """Return the value of an environment variable or raise CommandError."""
    value = os.environ.get(name, "").strip()
    if not value:
        raise CommandError(
            f"Environment variable '{name}' is not set. "
            "Set it in your .env file or deployment secrets before running "
            "seed_default_admin."
        )
    return value


def _load_extra_admins():
    """
    Build the extra-admin list from numbered env vars:
      EXTRA_ADMIN_1_EMAIL, EXTRA_ADMIN_1_FIRST_NAME, EXTRA_ADMIN_1_LAST_NAME
      EXTRA_ADMIN_2_EMAIL, …
    Returns a list of (first_name, last_name, email) tuples.
    """
    admins = []
    n = 1
    while True:
        email = os.environ.get(f"EXTRA_ADMIN_{n}_EMAIL", "").strip()
        if not email:
            break
        first = os.environ.get(f"EXTRA_ADMIN_{n}_FIRST_NAME", "").strip()
        last = os.environ.get(f"EXTRA_ADMIN_{n}_LAST_NAME", "").strip()
        if not first or not last:
            raise CommandError(
                f"EXTRA_ADMIN_{n}_EMAIL is set but "
                f"EXTRA_ADMIN_{n}_FIRST_NAME / EXTRA_ADMIN_{n}_LAST_NAME are missing."
            )
        admins.append((first, last, email))
        n += 1
    return admins


class Command(BaseCommand):
    help = (
        "Creates the default admin user (if no users exist), ensures any "
        "extra admin accounts, and ensures AI config exists. "
        "Credentials are read from ADMIN_EMAIL and ADMIN_PASSWORD env vars."
    )

    def handle(self, *args, **options):
        AIConfiguration.objects.get_or_create(pk=1)
        self.stdout.write("AI configuration initialized")

        for role_name in ["CCTV Chief", "CCTV Operator", "Barangay Tanod"]:
            Role.objects.get_or_create(name=role_name)

        chief_role = Role.objects.get(name=DEFAULT_ROLE)

        admin_email = _get_required_env("ADMIN_EMAIL")
        admin_password = _get_required_env("ADMIN_PASSWORD")
        extra_admins = _load_extra_admins()

        self._seed_default_admin(chief_role, admin_email, admin_password)
        self._seed_extra_admins(chief_role, extra_admins, admin_password)

    def _seed_default_admin(self, chief_role, email: str, password: str):
        admin = User.objects.filter(email__iexact=email).first()
        if admin:
            changed = []
            if not admin.role or admin.role.name != DEFAULT_ROLE:
                admin.role = chief_role
                changed.append("role")
            if not admin.is_staff:
                admin.is_staff = True
                changed.append("is_staff")
            if not admin.is_superuser:
                admin.is_superuser = True
                changed.append("is_superuser")
            if changed:
                admin.save(update_fields=changed)
                self.stdout.write(self.style.SUCCESS(
                    f"Updated admin account ({email}): {', '.join(changed)}"
                ))
            else:
                self.stdout.write(f"Admin account already present and correct: {email}")
            return

        if User.objects.exists():
            self.stdout.write(
                "Users exist but the configured admin account was not found — skipping creation"
            )
            return

        User.objects.create_superuser(
            email=email,
            password=password,
            first_name="System",
            last_name="Administrator",
            role=chief_role,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Created default admin account: {email}"
        ))

    def _seed_extra_admins(self, chief_role, extra_admins: list, initial_password: str):
        """
        Ensure each extra admin account exists with the correct role and
        superuser flags.  Passwords are NEVER reset for existing accounts —
        only newly created accounts receive the initial password.
        """
        for first_name, last_name, email in extra_admins:
            user = User.objects.filter(email__iexact=email).first()

            if user is None:
                User.objects.create_superuser(
                    email=email,
                    password=initial_password,
                    first_name=first_name,
                    last_name=last_name,
                    role=chief_role,
                )
                self.stdout.write(self.style.SUCCESS(
                    f"Created extra admin account: {email}"
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

            if changed:
                user.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Updated extra admin account {email}: {', '.join(changed)}"
                ))
            else:
                self.stdout.write(f"Extra admin account already present: {email}")
