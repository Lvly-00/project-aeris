from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "Admin", "Admin"
        OPERATOR = "Operator", "Operator"
        TANOD = "Tanod", "Barangay Tanod"

    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.TANOD  # Changed default since Viewer is gone
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

    # Simplified helper methods
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    def is_operator(self) -> bool:
        return self.role == self.Role.OPERATOR

    def is_tanod(self) -> bool:
        return self.role == self.Role.TANOD

    def can_verify(self) -> bool:
        # Assuming Admins and Operators can verify
        return self.role in (self.Role.ADMIN, self.Role.OPERATOR)

    def can_dispatch(self) -> bool:
        return self.role in (self.Role.ADMIN, self.Role.OPERATOR)


@receiver(post_save, sender=User)
def create_dispatcher_for_tanod(sender, instance, created, **kwargs):
    from apps.dispatch.models import Dispatcher
    # Signal now only triggers for Tanod
    if created and instance.role == User.Role.TANOD:
        Dispatcher.objects.get_or_create(
            user=instance,
            defaults={
                "dispatcher_type": Dispatcher.DispatcherType.BARANGAY_TANOD,
                "phone_number": instance.phone_number,
            },
        )