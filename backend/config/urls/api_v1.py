"""
API v1 URL configuration.
All consumer-facing endpoints live here, mounted under /api/ by main.py.
"""
from django.conf import settings
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from rest_framework_simplejwt.views import TokenVerifyView

from apps.health.views import HealthView
from config.urls.internal import AIPublicIncidentCreateView
from config.views.token_refresh_cookie import CookieTokenRefreshView

urlpatterns = [
    # ── Health probe (compose, nginx, deploy script) ──────────────────────────
    path("health/", HealthView.as_view(), name="health"),

    # ── AI service ingest from outside the Docker network ────────────────────
    # Same handler as /internal/incidents/create/, but reachable over the public
    # API and authenticated with X-API-Key (AI_SERVICE_API_KEY). Desktop installs
    # run their sidecar on the operator's PC, where nginx refuses /internal/.
    path(
        "ai/incidents/create/",
        AIPublicIncidentCreateView.as_view(),
        name="ai-incident-create",
    ),

    # ── JWT auth ──────────────────────────────────────────────────────────────
    # No TokenObtainPairView here: it would issue tokens with email+password
    # alone, bypassing 2FA, trusted-device checks, audit logs and throttling.
    # Logins must go through /accounts/login/ (and the 2FA verify action).
    path("auth/token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
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

# ── OpenAPI schema & docs (opt-in) ────────────────────────────────────────────
if settings.EXPOSE_API_DOCS:
    urlpatterns += [
        path("schema/", SpectacularAPIView.as_view(), name="schema"),
        path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    ]
