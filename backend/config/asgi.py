import os

# IMPORTANT: get_asgi_application() must run django.setup() BEFORE importing
# anything that touches models (Channels routing, JWT middleware), otherwise
# you get "AppRegistryNotReady: Apps aren't loaded yet."
from django.core.asgi import get_asgi_application

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings",
)

django_asgi_app = get_asgi_application()

# These imports load Django models — safe now that the app registry is ready.
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.incidents.routing import websocket_urlpatterns  # noqa: E402
from config.jwt_auth import JWTAuthMiddleware  # noqa: E402


application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": JWTAuthMiddleware(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})