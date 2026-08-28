import re

from django.core.exceptions import ValidationError

# Project-specific common-password list (FR-PP-005). Django's built-in
# CommonPasswordValidator covers a broader list; this catches the obvious
# AERIS-flavoured offenders (admin123, password123, qwerty123, ...).
DISALLOWED_COMMON_PASSWORDS = {
    "password", "password123", "password1", "123456", "12345678", "123456789",
    "1234567890", "12345", "qwerty", "qwerty123", "qwertyuiop", "admin",
    "admin123", "admin1234", "administrator", "letmein", "welcome", "iloveyou",
    "monkey", "dragon", "abc123", "football", "baseball", "sunshine", "princess",
    "superman", "mustang", "batman", "trustno1", "michael", "123123", "111111",
    "000000", "master", "shadow", "654321", "jordan23",
}


class ComplexityPasswordValidator:
    """Enforce length + character variety (uppercase, lowercase, number, special)."""

    min_length = 8

    def validate(self, password, user=None):
        errors = []
        if len(password) < self.min_length:
            errors.append(f"This password must be at least {self.min_length} characters long.")
        if not re.search(r"[A-Z]", password):
            errors.append("This password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", password):
            errors.append("This password must contain at least one lowercase letter.")
        if not re.search(r"\d", password):
            errors.append("This password must contain at least one number.")
        if not re.search(r"[^A-Za-z0-9]", password):
            errors.append("This password must contain at least one special character.")
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return (
            "Your password must be at least %d characters long and contain an "
            "uppercase letter, a lowercase letter, a number, and a special "
            "character." % self.min_length
        )


class CommonPasswordListValidator:
    """Reject passwords listed in the project-specific common list."""

    def validate(self, password, user=None):
        if password.lower() in DISALLOWED_COMMON_PASSWORDS:
            raise ValidationError("This password is too common. Please choose a stronger one.")

    def get_help_text(self):
        return "Your password must not be a commonly used password."