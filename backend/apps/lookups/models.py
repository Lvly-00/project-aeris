from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "roles"

    def __str__(self) -> str:
        return self.name


class IncidentType(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "incident_types"

    def __str__(self) -> str:
        return self.name


class IncidentStatus(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "incident_statuses"

    def __str__(self) -> str:
        return self.name


class CameraStatus(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "camera_statuses"

    def __str__(self) -> str:
        return self.name


class NotificationType(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = "notification_types"

    def __str__(self) -> str:
        return self.name
