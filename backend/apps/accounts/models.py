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
