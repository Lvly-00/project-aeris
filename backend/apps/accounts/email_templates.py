"""
One layout for every single-use code email.

Login 2FA, 2FA setup, password reset and email change all send the same
thing: a short greeting, one line of instruction, the code in large type,
how long it lasts, and what to do if it was not requested. The layout is a
quiet white page with the AERIS mark, the code in brand orange, and a grey
footer — no cards, buttons or decorative chrome.

Inline styles carry the light design because many clients strip <style>; the
small block at the top adds a dark variant for clients that honour
prefers-color-scheme. Images and links are absolute, built from
PUBLIC_APP_URL, and the wordmark is used instead when that setting is empty.
"""
from django.conf import settings
from django.utils.html import escape

BRAND_ORANGE = "#FF5A05"
BRAND_ORANGE_DARK = "#FF7A33"
TEXT = "#1d1d1f"
MUTED = "#5f6368"
FOOTER_BG = "#f5f6f7"
FOOTER_TEXT = "#6b6f76"

FONT = (
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,"
    "Helvetica,Arial,sans-serif"
)

FOOTER_LINE = "AERIS · Barangay Sampaloc, Apalit, Pampanga"
FOOTER_NOTE = "This is an automated message. Please do not reply."


def app_base_url() -> str:
    """Public web origin used for absolute image URLs, without a trailing /."""
    return (getattr(settings, "PUBLIC_APP_URL", "") or "").rstrip("/")


def _brand_html(logo_url: str | None = None) -> str:
    wordmark = (
        f'<span class="brand-word" style="font-family:{FONT};font-size:15px;'
        f'font-weight:600;line-height:1;letter-spacing:0.2px;color:{TEXT};">'
        "AERIS</span>"
    )
    # None means "use the configured origin"; "" forces the wordmark, and a
    # full URL (including a data: URI) is used verbatim — the preview command
    # relies on that to inline the icon.
    url = app_base_url() if logo_url is None else logo_url.strip()
    if not url:
        return wordmark

    src = url if url.startswith("data:") else f"{url.rstrip('/')}/icons/icon-192.png"
    return (
        f'<img src="{escape(src)}" width="28" height="28"'
        ' alt="" style="display:inline-block;vertical-align:middle;'
        'border-radius:7px;margin-right:9px;">' + wordmark
    )


def render_code_email(
    *,
    first_name: str,
    intro: str,
    code: str,
    expiry_minutes: int,
    ignore_note: str,
    logo_url: str | None = None,
) -> tuple[str, str]:
    """
    Return ``(html, text)`` for one code email.

    ``first_name`` is user input, so it is escaped before entering the HTML.
    """
    name = (first_name or "").strip()
    greeting = f"Hi, {escape(name)}," if name else "Hi,"
    expiry = (
        f"This code is valid for {expiry_minutes} minutes and can only be "
        "used once."
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>AERIS verification code</title>
<style>
  @media (prefers-color-scheme: dark) {{
    body, .page {{ background:#111214 !important; }}
    .text {{ color:#e7e7e8 !important; }}
    .muted {{ color:#a3a6aa !important; }}
    .code {{ color:{BRAND_ORANGE_DARK} !important; }}
    .brand-word {{ color:#e7e7e8 !important; }}
    .footer {{ background:#1a1b1e !important; }}
    .footer-text {{ color:#9b9ea2 !important; }}
  }}
</style>
</head>
<body class="page" style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px 36px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;">
          <tr>
            <td style="padding:0 8px 26px;">{_brand_html(logo_url)}</td>
          </tr>
          <tr>
            <td class="text" style="padding:0 8px;font-family:{FONT};font-size:15px;line-height:1.65;color:{TEXT};">
              <p style="margin:0 0 18px;">{greeting}</p>
              <p style="margin:0 0 18px;">{escape(intro)}</p>
              <p class="code" style="margin:0 0 22px;font-family:{FONT};font-size:34px;font-weight:700;line-height:1.1;letter-spacing:9px;color:{BRAND_ORANGE};">{escape(code)}</p>
              <p class="muted" style="margin:0 0 18px;color:{MUTED};">{expiry}</p>
              <p style="margin:0 0 24px;">{escape(ignore_note)}</p>
              <p style="margin:0;">Best regards,<br>AERIS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" class="footer" style="background:{FOOTER_BG};padding:22px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:480px;">
          <tr>
            <td class="footer-text" align="center" style="font-family:{FONT};font-size:12px;line-height:1.7;color:{FOOTER_TEXT};">
              {FOOTER_LINE}<br>{FOOTER_NOTE}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text = (
        f"{greeting}\n\n"
        f"{intro}\n\n"
        f"{code}\n\n"
        f"{expiry}\n\n"
        f"{ignore_note}\n\n"
        "Best regards,\n"
        "AERIS\n\n"
        f"---\n{FOOTER_LINE}\n{FOOTER_NOTE}\n"
    )

    return html, text
