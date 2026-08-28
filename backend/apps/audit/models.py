from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    class Action(models.TextChoices):
        LOGIN = "Login", "Login"
        LOGIN_FAILED = "Login_Failed", "Login Failed"
        LOGOUT = "Logout", "Logout"
        ACCOUNT_LOCKED = "Account_Locked", "Account Locked"
        ACCOUNT_UNLOCKED = "Account_Unlocked", "Account Unlocked"
        PASSWORD_RESET_REQUESTED = "Password_Reset_Requested", "Password Reset Requested"
        PASSWORD_RESET_COMPLETED = "Password_Reset_Completed", "Password Reset Completed"
        INCIDENT_CREATED = "Incident_Created", "Incident Created"
        INCIDENT_VERIFIED = "Incident_Verified", "Incident Verified"
        INCIDENT_DISMISSED = "Incident_Dismissed", "Incident Dismissed"
        INCIDENT_DISPATCHED = "Incident_Dispatched", "Incident Dispatched"
        INCIDENT_RESOLVED = "Incident_Resolved", "Incident Resolved"
        INCIDENT_ARCHIVED = "Incident_Archived", "Incident Archived"
        INCIDENT_UPDATED = "Incident_Updated", "Incident Updated"
        CAMERA_CREATED = "Camera_Created", "Camera Created"
        CAMERA_UPDATED = "Camera_Updated", "Camera Updated"
        CAMERA_DELETED = "Camera_Deleted", "Camera Deleted"
        USER_CREATED = "User_Created", "User Created"
        USER_UPDATED = "User_Updated", "User Updated"
        USER_DEACTIVATED = "User_Deactivated", "User Deactivated"
        AI_CONFIG_CHANGED = "AI_Config_Changed", "AI Configuration Changed"
        SETTINGS_CHANGED = "Settings_Changed", "Settings Changed"
        PROFILE_UPDATED = "Profile_Updated", "Profile Updated"
        PASSWORD_CHANGED = "Password_Changed", "Password Changed"
        EMAIL_CHANGE_REQUESTED = "Email_Change_Requested", "Email Change Requested"
        EMAIL_CHANGE_COMPLETED = "Email_Change_Completed", "Email Change Completed"
        CHIEF_MODE_ENTERED = "Chief_Mode_Entered", "Chief Mode Entered"
        CHIEF_MODE_EXITED = "Chief_Mode_Exited", "Chief Mode Exited"
        TWO_FACTOR_ENABLED = "Two_Factor_Enabled", "Two-Factor Authentication Enabled"
        TWO_FACTOR_DISABLED = "Two_Factor_Disabled", "Two-Factor Authentication Disabled"
        TWO_FACTOR_VERIFIED = "Two_Factor_Verified", "Two-Factor Verification Successful"
        TWO_FACTOR_FAILED = "Two_Factor_Failed", "Two-Factor Verification Failed"
        AGREEMENT_ACCEPTED = "Agreement_Accepted", "Agreement Accepted"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    resource_type = models.CharField(max_length=50, blank=True, default="")
    resource_id = models.IntegerField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} by {self.user} @ {self.created_at}"
