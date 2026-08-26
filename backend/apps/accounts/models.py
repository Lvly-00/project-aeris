from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Manager for the email-only User model."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The email address must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Email-only user account. The username column is unused;
    authentication and identification both use the email address.
    """

    username = None
    date_joined = None

    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(default=timezone.now)

    role = models.ForeignKey(
        "lookups.Role",
        on_delete=models.PROTECT,
        related_name="users",
    )
    two_factor_enabled = models.BooleanField(default=False)
    receive_notifications = models.BooleanField(default=True)
    preferred_language = models.CharField(
        max_length=10,
        default="English",
        choices=[("English", "English"), ("Filipino", "Filipino")],
    )
    profile_picture = models.ImageField(upload_to="profiles/", null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.get_full_name() or self.email

    # Role helpers compare against the seeded lookup names.
    @property
    def role_name(self) -> str:
        return self.role.name if self.role_id else ""

    def is_admin(self) -> bool:
        return self.role_name == "CCTV Chief"

    def is_operator(self) -> bool:
        return self.role_name == "CCTV Operator"

    def is_tanod(self) -> bool:
        return self.role_name == "Barangay Tanod"

    def can_verify(self) -> bool:
        return self.role_name in ("CCTV Chief", "CCTV Operator")

    def can_dispatch(self) -> bool:
        return self.role_name in ("CCTV Chief", "CCTV Operator")


class PasswordResetCode(models.Model):
    """
    Single-use, time-limited password-reset verification code.

    Only a SHA-256 hash of the 6-digit code is stored; the plaintext code is
    delivered to the user by email (console backend until SMTP is configured).
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_codes",
    )
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Password reset code"
        verbose_name_plural = "Password reset codes"

    def __str__(self) -> str:
        return f"Reset code for {self.user.email} (used={self.is_used})"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_exhausted(self) -> bool:
        return self.attempts >= 5


class EmailChangeCode(models.Model):
    """
    Single-use, time-limited verification code for email address changes.
    Only a SHA-256 hash is stored; the plaintext code is sent to the
    user's CURRENT email address.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="email_change_codes",
    )
    new_email = models.EmailField(blank=True, default="")
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    verified = models.BooleanField(default=False)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email change code"
        verbose_name_plural = "Email change codes"

    def __str__(self) -> str:
        return f"Email change code for {self.user.email} → {self.new_email}"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_exhausted(self) -> bool:
        return self.attempts >= 5


class TwoFactorCode(models.Model):
    """
    Single-use, time-limited verification code for two-factor authentication
    setup (enable/disable) from the profile page.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="two_factor_codes",
    )
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Two-factor code"
        verbose_name_plural = "Two-factor codes"

    def __str__(self) -> str:
        return f"2FA code for {self.user.email} (used={self.is_used})"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_exhausted(self) -> bool:
        return self.attempts >= 5


class TrustedDevice(models.Model):
    """
    A device that has already passed 2FA verification.
    Subsequent logins from this device skip the 2FA step.
    device_id is a SHA-256 hash of the browser fingerprint.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="trusted_devices",
    )
    device_id = models.CharField(max_length=128)
    label = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_used_at"]
        unique_together = ["user", "device_id"]
        verbose_name = "Trusted device"
        verbose_name_plural = "Trusted devices"

    def __str__(self) -> str:
        return f"Trusted device for {self.user.email}: {self.label or self.device_id[:12]}"
