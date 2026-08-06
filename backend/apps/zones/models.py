from django.db import models


class Zone(models.Model):
    name = models.CharField(max_length=200)
    barangay = models.CharField(max_length=200)
    boundary_coords = models.JSONField(
        help_text="Polygon coordinates as GeoJSON-like geometry",
        default=dict, blank=True,
    )
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Zone"
        verbose_name_plural = "Zones"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} - {self.barangay}"
