from django_filters import FilterSet, Filter
from django_filters import MultipleChoiceFilter
from django import forms
from .models import Dispatch


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


class DispatchFilter(FilterSet):
    status__in = CSVFilter(field_name="status")
    dispatcher_type = MultipleChoiceFilter(
        field_name="dispatcher__dispatcher_type", lookup_expr="exact",
        choices=Dispatch._meta.get_field("status").choices,
    )

    class Meta:
        model = Dispatch
        fields = ["incident", "status", "dispatcher"]
