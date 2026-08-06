from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "Admin", "Admin"
        OPERATOR = "Operator", "Operator"
        VIEWER = "Viewer", "Viewer"
        BARANGAY_OFFICIAL = "Barangay_Official", "Barangay Official"
        BARANGAY_TANOD = "Barangay_Tanod", "Barangay Tanod"

    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.VIEWER
    )
    phone_number = models.CharField(max_length=20, blank=True, default="")
    barangay_zone = models.ForeignKey(
        "zones.Zone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.get_full_name() or self.username

    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    def is_operator(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.OPERATOR)

    def is_barangay_official(self) -> bool:
        return self.role == self.Role.BARANGAY_OFFICIAL

    def is_barangay_tanod(self) -> bool:
        return self.role == self.Role.BARANGAY_TANOD

    def can_verify(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.OPERATOR, self.Role.BARANGAY_OFFICIAL)

    def can_dispatch(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.OPERATOR)


@receiver(post_save, sender=User)
def create_dispatcher_for_tanod(sender, instance, created, **kwargs):
    from apps.dispatch.models import Dispatcher
    if created and instance.role in (
        User.Role.BARANGAY_TANOD, User.Role.BARANGAY_OFFICIAL
    ):
        dispatcher_type_map = {
            User.Role.BARANGAY_TANOD: Dispatcher.DispatcherType.BARANGAY_TANOD,
            User.Role.BARANGAY_OFFICIAL: Dispatcher.DispatcherType.BARANGAY_OFFICIAL,
        }
        Dispatcher.objects.get_or_create(
            user=instance,
            defaults={
                "dispatcher_type": dispatcher_type_map[instance.role],
                "phone_number": instance.phone_number,
            },
        )
