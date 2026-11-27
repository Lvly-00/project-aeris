"""Cookie-aware JWT refresh: rotate the refresh token held in an HttpOnly cookie."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenRefreshView

from config.auth_cookies import (
    delete_refresh_cookie,
    get_refresh_token,
    has_refresh_csrf_header,
    remember_requested,
    set_refresh_cookie,
)


class CookieTokenRefreshView(TokenRefreshView):
    """Read the refresh token from the cookie and keep it HttpOnly on rotation."""

    def post(self, request, *args, **kwargs):
        # The cookie is ambient credentials. Require a custom header so a
        # cross-site HTML form (which cannot set headers) cannot rotate it.
        if not has_refresh_csrf_header(request):
            return Response(
                {"detail": "Refresh requests require an XMLHttpRequest header."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token = get_refresh_token(request)
        if token:
            incoming = request.data or {}
            data = incoming.dict() if hasattr(incoming, "dict") else dict(incoming)
            data["refresh"] = token
            # TokenRefreshView.get_serializer() reads request.data; keep the
            # rest of the payload available to the view.
            request._full_data = data

        response = super().post(request, *args, **kwargs)

        if response.status_code == status.HTTP_200_OK:
            rotated = response.data.get("refresh")
            if rotated:
                set_refresh_cookie(response, rotated, remember_requested(request))
                response.data.pop("refresh", None)
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            delete_refresh_cookie(response)
        return response
