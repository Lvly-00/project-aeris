from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.lookups.models import Role

User = get_user_model()

DEFAULT_PASSWORD = "Barangay2026!"

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
            default=DEFAULT_PASSWORD,
            help="Password assigned to every seeded user",
        )

    def handle(self, *args, **options):
        password = options["password"]
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
                agreement_accepted=True,
                agreement_accepted_at=timezone.now(),
                receive_notifications=True,
            )
            created[data["role"].name] += 1

        self.stdout.write(self.style.SUCCESS(
            f"Created {created['CCTV Operator']} CCTV Operator(s) and "
            f"{created['Barangay Tanod']} Barangay Tanod(s) "
            f"(skipped {skipped['CCTV Operator'] + skipped['Barangay Tanod']} existing)"
        ))
        self.stdout.write(f"Seeded user password: {password}")