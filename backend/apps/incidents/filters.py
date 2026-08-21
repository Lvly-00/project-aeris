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
    # Status and incident type are lookup FKs; the CSV filters match
    # against their names so the API contract stays string-based.
    status__in = CSVFilter(field_name="status__name")
    incident_type__in = CSVFilter(field_name="incident_type__name")
    severity__in = CSVFilter(field_name="severity")

    class Meta:
        model = Incident
        fields = ["incident_type", "severity", "status", "camera"]
