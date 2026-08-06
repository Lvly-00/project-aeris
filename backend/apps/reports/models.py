from django.db import models
from django.conf import settings


class Report(models.Model):
    class ReportType(models.TextChoices):
        DAILY = "Daily", "Daily"
        WEEKLY = "Weekly", "Weekly"
        MONTHLY = "Monthly", "Monthly"

    title = models.CharField(max_length=300)
    report_type = models.CharField(
        max_length=10, choices=ReportType.choices
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_reports",
    )
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_reports",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    date_range_start = models.DateTimeField()
    date_range_end = models.DateTimeField()
    file_pdf = models.FileField(
        upload_to="reports/pdf/", blank=True, null=True
    )
    file_excel = models.FileField(
        upload_to="reports/excel/", blank=True, null=True
    )
    parameters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Report"
        verbose_name_plural = "Reports"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
