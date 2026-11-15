"""Send one test email through the configured transactional-email provider."""
from email.utils import parseaddr

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from apps.accounts.email import send_email


class Command(BaseCommand):
    help = (
        "Send a test email through the Brevo API to verify the deployed "
        "transactional-email configuration."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            nargs="?",
            help="Recipient address (defaults to DEFAULT_FROM_EMAIL).",
        )

    def handle(self, *args, **options):
        if not getattr(settings, "BREVO_API_KEY", ""):
            raise CommandError(
                "BREVO_API_KEY is not set for this environment. Configure it "
                "(and DEFAULT_FROM_EMAIL) before sending mail."
            )

        recipient = options["email"] or parseaddr(settings.DEFAULT_FROM_EMAIL)[1]
        if not recipient:
            raise CommandError(
                "No recipient given and DEFAULT_FROM_EMAIL is empty. Pass an "
                "email address: manage.py send_test_email you@example.com"
            )
        try:
            validate_email(recipient)
        except ValidationError as exc:
            raise CommandError(f"'{recipient}' is not a valid email address.") from exc

        sender = getattr(settings, "DEFAULT_FROM_EMAIL", "")
        self.stdout.write(f"Sending test email from {sender} to {recipient} ...")

        sent = send_email(
            to_email=recipient,
            subject="AERIS test email",
            html_content=(
                "<p>This is a test message from the AERIS backend.</p>"
                "<p>If you received it, transactional email is configured "
                "correctly.</p>"
            ),
            text_content=(
                "This is a test message from the AERIS backend.\n"
                "If you received it, transactional email is configured "
                "correctly.\n"
            ),
        )
        if not sent:
            raise CommandError(
                "Brevo did not accept the message. Check the backend log for "
                "the API status and response body, and confirm the sender "
                "address is verified in Brevo."
            )

        self.stdout.write(
            self.style.SUCCESS(f"Brevo accepted the test email for {recipient}.")
        )
