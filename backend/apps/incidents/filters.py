import django_filters
from django_filters import Filter
from django import forms
from .models import Incident


class CSVFilter(Filter):
    field_class = forms.CharField

    def filter(self, qs, value):
        if not value:
            return qs
        values = [v.strip() for v in value.split(",") if v.strip()]
        if not values:
            return qs
        lookup = "__".join([self.field_name, "in"])
        return qs.filter(**{lookup: values})


class IncidentFilter(django_filters.FilterSet):
    status__in = CSVFilter(field_name="status")
    incident_type__in = CSVFilter(field_name="incident_type")
    severity__in = CSVFilter(field_name="severity")

    class Meta:
        model = Incident
        fields = ["incident_type", "severity", "status", "zone", "camera"]
