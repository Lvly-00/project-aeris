from django.db import migrations


def normalize_uppercase_actions(apps, schema_editor):
    """Legacy rows stored actions in ALL_CAPS (e.g. "LOGIN", "USER_DEACTIVATED")
    which no longer match the Title_Case choice values. Title-case any value
    that contains no lowercase letters so history displays consistently."""
    AuditLog = apps.get_model("audit", "AuditLog")
    lowercase = set("abcdefghijklmnopqrstuvwxyz")
    for row in AuditLog.objects.all().iterator():
        action = row.action or ""
        if any(ch in lowercase for ch in action):
            continue
        row.action = "_".join(part.capitalize() for part in action.split("_"))
        row.save(update_fields=["action"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0006_alter_auditlog_action"),
    ]

    operations = [
        migrations.RunPython(normalize_uppercase_actions, noop),
    ]