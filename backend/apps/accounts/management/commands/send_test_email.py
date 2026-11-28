"""Send one test email, or write the code email to a file for local preview."""
import base64
from email.utils import parseaddr
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from apps.accounts.email import send_email
from apps.accounts.email_templates import render_code_email

SAMPLE_CODE = "847628"


class Command(BaseCommand):
    help = (
        "Send a test email through the Brevo API to verify the deployed "
        "transactional-email configuration, or write the code email to an "
        "HTML file for a local preview (--preview)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            nargs="?",
            help="Recipient address (defaults to DEFAULT_FROM_EMAIL).",
        )
        parser.add_argument(
            "--preview",
            nargs="?",
            const="",
            default=None,
            metavar="FILE",
            help=(
                "Write the rendered code email to FILE instead of sending. "
                "Without FILE it writes media/email-preview.html."
            ),
        )
        parser.add_argument(
            "--first-name",
            default="Juan",
            help="Name used in the preview greeting (default: Juan).",
        )

    def handle(self, *args, **options):
        # Previewing never touches Brevo, so it does not need the API key.
        if options["preview"] is not None:
            self._write_preview(options["preview"], options["first_name"])
            return

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

    def _write_preview(self, path: str, first_name: str) -> None:
        target = (
            Path(path)
            if path
            else Path(settings.MEDIA_ROOT) / "email-preview.html"
        )
        target.parent.mkdir(parents=True, exist_ok=True)

        html, _ = render_code_email(
            first_name=first_name,
            intro="Enter this code to continue logging in without a password:",
            code=SAMPLE_CODE,
            expiry_minutes=20,
            ignore_note=(
                "If you didn't attempt to log in, you can safely ignore this "
                "email."
            ),
            # Inline the icon so a file:// preview shows the real mark without
            # a running frontend. Falls back to the wordmark if it is missing.
            logo_url=self._icon_data_uri(),
        )
        target.write_text(html, encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"Preview written to {target}"))
        self.stdout.write("Open it in a browser. No email was sent.")

    @staticmethod
    def _icon_data_uri() -> str:
        icon = (
            Path(settings.BASE_DIR).parent
            / "frontend"
            / "public"
            / "icons"
            / "icon-192.png"
        )
        if not icon.is_file():
            return ""
        encoded = base64.b64encode(icon.read_bytes()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
