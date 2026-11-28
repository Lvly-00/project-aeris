import os

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.lookups.models import Role

User = get_user_model()

# ---------------------------------------------------------------------------
# No credential belongs in source control: the seeded password comes from the
# SEED_USERS_PASSWORD env var (or --password) and is always hashed by
# UserManager.create_user, exactly like a password set through the API.
# ---------------------------------------------------------------------------
PASSWORD_ENV_VAR = "SEED_USERS_PASSWORD"


def _require_password(options) -> str:
    """Return the seed password from --password or the environment."""
    value = (options.get("password") or os.environ.get(PASSWORD_ENV_VAR, "")).strip()
    if not value:
        raise CommandError(
            f"Set {PASSWORD_ENV_VAR} in your .env or pass --password; "
            "seed accounts are never created with a password baked into the code."
        )
    return value

OPERATOR_NAMES = [
    ("Alvin", "Santos"), ("Bianca", "Reyes"), ("Carl", "Dela Cruz"),
    ("Diana", "Ramos"), ("Ethan", "Mendoza"), ("Faith", "Torres"),
    ("Gabriel", "Flores"), ("Hannah", "Aquino"), ("Ivan", "Garcia"),
    ("Jasmine", "Lopez"),
]

TANOD_NAMES = [
    ("Aaron", "Bautista"), ("Bea", "Salazar"), ("Carlo", "Navarro"),
    ("Dexter", "Castro"), ("Erika", "Villanueva"), ("Fernando", "Roxas"),
    ("Grace", "Abad"), ("Harold", "Sison"), ("Iris", "Manalo"),
    ("Jerome", "Buenaventura"), ("Kristine", "Padilla"), ("Leo", "Domingo"),
    ("Mia", "Ferrer"), ("Nathan", "Canlas"), ("Olivia", "Sarmiento"),
    ("Paolo", "Vergara"), ("Queenie", "Belo"), ("Ramon", "Sebastian"),
    ("Sofia", "Legaspi"), ("Tomas", "Imperial"), ("Uriel", "Dizon"),
    ("Vanessa", "Mercado"), ("Winston", "Ocampo"), ("Xyra", "Bautista"),
    ("Yuri", "Regala"), ("Zandra", "Capulong"), ("Adrian", "Pascual"),
    ("Bles", "Duran"), ("Christine", "Valdez"), ("Dennis", "Sacramento"),
    ("Eleanor", "Rosario"), ("Ferdie", "Malvar"), ("Gina", "Suarez"),
    ("Henry", "Palma"), ("Isabel", "Cruz"), ("Joey", "Tolentino"),
    ("Kyla", "Mangalindan"), ("Lance", "Verano"), ("Maricel", "Ancheta"),
    ("Noel", "Zamora"),
]


def ensure_roles():
    for name in ["CCTV Operator", "Barangay Tanod"]:
        Role.objects.get_or_create(name=name)


class Command(BaseCommand):
    help = "Seeds 10 CCTV Operators and 40 Barangay Tanods for development/testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=None,
            help=(
                "Password assigned to every seeded user; defaults to the "
                f"{PASSWORD_ENV_VAR} environment variable"
            ),
        )

    def handle(self, *args, **options):
        password = _require_password(options)
        ensure_roles()

        operator_role = Role.objects.get(name="CCTV Operator")
        tanod_role = Role.objects.get(name="Barangay Tanod")

        created = {"CCTV Operator": 0, "Barangay Tanod": 0}
        skipped = {"CCTV Operator": 0, "Barangay Tanod": 0}

        payloads = []
        for i, (first, last) in enumerate(OPERATOR_NAMES, start=1):
            payloads.append({
                "email": f"operator{i}@barangay.local",
                "first_name": first,
                "last_name": last,
                "role": operator_role,
            })
        for i, (first, last) in enumerate(TANOD_NAMES, start=1):
            payloads.append({
                "email": f"tanod{i}@barangay.local",
                "first_name": first,
                "last_name": last,
                "role": tanod_role,
            })

        for data in payloads:
            existing = User.objects.filter(email__iexact=data["email"]).first()
            if existing:
                if existing.role_id != data["role"].id:
                    existing.role = data["role"]
                    existing.save(update_fields=["role"])
                skipped[data["role"].name] += 1
                continue

            User.objects.create_user(
                email=data["email"],
                password=password,
                first_name=data["first_name"],
                last_name=data["last_name"],
                role=data["role"],
                receive_notifications=True,
            )
            created[data["role"].name] += 1

        self.stdout.write(self.style.SUCCESS(
            f"Created {created['CCTV Operator']} CCTV Operator(s) and "
            f"{created['Barangay Tanod']} Barangay Tanod(s) "
            f"(skipped {skipped['CCTV Operator'] + skipped['Barangay Tanod']} existing)"
        ))