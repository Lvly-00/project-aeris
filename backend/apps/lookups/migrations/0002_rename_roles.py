from django.db import migrations


ROLE_RENAMES = {
    "Admin": "CCTV Chief",
    "Operator": "CCTV Operator",
    "Tanod": "Barangay Tanod",
}


def rename_roles(apps, schema_editor):
    Role = apps.get_model("lookups", "Role")
    for old_name, new_name in ROLE_RENAMES.items():
        role = Role.objects.filter(name=old_name).first()
        if role:
            role.name = new_name
            role.save(update_fields=["name"])


def revert_names(apps, schema_editor):
    Role = apps.get_model("lookups", "Role")
    for old_name, new_name in ROLE_RENAMES.items():
        role = Role.objects.filter(name=new_name).first()
        if role:
            role.name = old_name
            role.save(update_fields=["name"])


class Migration(migrations.Migration):

    dependencies = [
        ("lookups", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(rename_roles, revert_names),
    ]
