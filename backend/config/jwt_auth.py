from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model

User = get_user_model()

# The browser cannot set request headers on a WebSocket handshake, so the
# access token travels in the negotiated subprotocol instead. That keeps it out
# of the request URL entirely: a copied or shared URL carries no credential.
# ?token= query-param authentication has been intentionally removed — tokens
# embedded in URLs end up in proxy logs, browser history, and referrer headers,
# turning a short-lived credential into a persistent leaked secret.
TOKEN_SUBPROTOCOL_PREFIX = "jwt."


@database_sync_to_async
def get_user_from_token(token_str):
    try:
        token = AccessToken(token_str)
        user_id = token["user_id"]
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist):
        return AnonymousUser()


def extract_token(scope):
    """Return (token_str, subprotocol) from the WebSocket handshake subprotocols.

    The token MUST arrive as a negotiated subprotocol of the form
    ``jwt.<access_token>``.  Query-string tokens (?token=…) are explicitly
    rejected: they end up in proxy access logs, browser history, and shared
    links, which turns a short-lived access token into a leaked credential.
    """
    for protocol in scope.get("subprotocols") or []:
        if protocol.startswith(TOKEN_SUBPROTOCOL_PREFIX):
            return protocol[len(TOKEN_SUBPROTOCOL_PREFIX):], protocol

    return None, None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        token_str, subprotocol = extract_token(scope)

        if token_str:
            scope["user"] = await get_user_from_token(token_str)
        else:
            scope["user"] = AnonymousUser()

        # The consumer has to echo the chosen subprotocol, otherwise the
        # browser rejects the handshake it offered.
        scope["aeris_subprotocol"] = subprotocol

        return await super().__call__(scope, receive, send)
