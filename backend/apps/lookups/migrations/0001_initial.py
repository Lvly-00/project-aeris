from django.db import migrations, models


def seed_lookups(apps, schema_editor):
    Role = apps.get_model("lookups", "Role")
    IncidentType = apps.get_model("lookups", "IncidentType")
    IncidentStatus = apps.get_model("lookups", "IncidentStatus")
    CameraStatus = apps.get_model("lookups", "CameraStatus")
    NotificationType = apps.get_model("lookups", "NotificationType")

    for name in ["CCTV Chief", "CCTV Operator", "Barangay Tanod"]:
        Role.objects.get_or_create(name=name)

    for name in ["Fire", "Smoke", "Vehicle_Accident"]:
        IncidentType.objects.get_or_create(name=name)

    for name in ["Detected", "Verified", "Dispatched", "Resolved", "Dismissed"]:
        IncidentStatus.objects.get_or_create(name=name)

    for name in ["Online", "Offline", "Connecting", "Error"]:
        CameraStatus.objects.get_or_create(name=name)

    for name in ["Alert", "Warning", "Info"]:
        NotificationType.objects.get_or_create(name=name)


class Migration(migrations.Migration):

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50, unique=True)),
            ],
            options={
                "db_table": "roles",
            },
        ),
        migrations.CreateModel(
            name="IncidentType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
            ],
            options={
                "db_table": "incident_types",
            },
        ),
        migrations.CreateModel(
            name="IncidentStatus",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
            ],
            options={
                "db_table": "incident_statuses",
            },
        ),
        migrations.CreateModel(
            name="CameraStatus",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
            ],
            options={
                "db_table": "camera_statuses",
            },
        ),
        migrations.CreateModel(
            name="NotificationType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
            ],
            options={
                "db_table": "notification_types",
            },
        ),
        migrations.RunPython(seed_lookups, migrations.RunPython.noop),
    ]
