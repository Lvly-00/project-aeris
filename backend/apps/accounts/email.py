"""
Brevo Transactional Email helper (API v3).

Uses the REST API directly via requests — no SDK dependency.
Free Brevo accounts can send transactional emails this way;
the SMTP relay requires a paid plan.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
    sender_name: str = "AERIS",
) -> bool:
    """
    Send a single transactional email via Brevo API v3.

    Returns True on success, False on failure (logged).
    """
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key:
        logger.error("BREVO_API_KEY is not configured — cannot send email")
        return False

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "Aeris <lovelypintes@gmail.com>")

    # Parse "Name <email>" format
    if "<" in from_email and ">" in from_email:
        name_part = from_email.split("<")[0].strip()
        addr_part = from_email.split("<")[1].rstrip(">").strip()
    else:
        name_part = sender_name
        addr_part = from_email

    payload = {
        "sender": {"name": name_part, "email": addr_part},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if text_content:
        payload["textContent"] = text_content

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key,
    }

    try:
        resp = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=15)
        if resp.status_code in (200, 201):
            logger.info("Brevo email sent to %s (status %s)", to_email, resp.status_code)
            return True
        logger.warning(
            "Brevo API error %s: %s", resp.status_code, resp.text[:500]
        )
        return False
    except requests.RequestException:
        logger.exception("Brevo API request failed for %s", to_email)
        return False
