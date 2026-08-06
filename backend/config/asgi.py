import os
from django.core.asgi import get_asgi_application

# Default to production; override with DJANGO_SETTINGS_MODULE in development.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from config.jwt_auth import JWTAuthMiddleware
import apps.incidents.routing as incidents_routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
            incidents_routing.websocket_urlpatterns
        )
    ),
})
