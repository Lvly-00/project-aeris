"""
API v1 URL configuration.
All consumer-facing endpoints live here, mounted under /api/ by main.py.
"""
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # ── OpenAPI schema & docs ─────────────────────────────────────────────────
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # ── JWT auth ──────────────────────────────────────────────────────────────
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # ── App routers ───────────────────────────────────────────────────────────
    path("accounts/", include("apps.accounts.urls")),
    path("cameras/", include("apps.cameras.urls")),
    path("incidents/", include("apps.incidents.urls")),
    path("detections/", include("apps.detections.urls")),
    path("notifications/", include("apps.notifications.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("contacts/", include("apps.contacts.urls")),
    path("dispatch/", include("apps.dispatch.urls")),
    path("audit/", include("apps.audit.urls")),
    path("ai-config/", include("apps.ai_config.urls")),
]
