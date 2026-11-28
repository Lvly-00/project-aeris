"""HttpOnly refresh-cookie helpers shared by the auth endpoints.

The SPA and the API live on different sites in production, so the cookie
policy is environment-dependent: SameSite=None + Secure over HTTPS in
production, SameSite=Lax without Secure for local/desktop development.
"""
from django.conf import settings

REFRESH_COOKIE_NAME = "aeris_refresh"
REMEMBER_COOKIE_NAME = "aeris_refresh_remember"


def _cookie_attributes() -> dict:
    """Attributes shared when writing and deleting the refresh cookies."""
    if settings.DEBUG:
        # Local dev / packaged desktop app: same-site localhost traffic.
        samesite, secure = "Lax", False
    else:
        # Deployed SPA and API are on different sites — requires
        # SameSite=None; Secure so the browser will send the cookie back.
        samesite, secure = "None", True
    return {
        "httponly": True,
        "samesite": samesite,
        "secure": secure,
        "path": "/",
    }


def _set_cookie(response, name: str, value: str, max_age=None) -> None:
    kwargs = _cookie_attributes()
    kwargs.update(key=name, value=str(value))
    if max_age is not None:
        kwargs["max_age"] = max_age
    response.set_cookie(**kwargs)


def _expire_cookie(response, name: str) -> None:
    # HttpResponse.delete_cookie() (Django 5.x) cannot carry Secure/HttpOnly,
    # which are required for a SameSite=None cookie to be accepted at all.
    # Writing an already-expired cookie removes it while keeping attributes
    # identical to the one that was set.
    _set_cookie(response, name, "", max_age=0)


def set_refresh_cookie(response, token, remember: bool) -> None:
    """Store the refresh token in an HttpOnly cookie (never in the JSON body).

    A companion non-secret cookie records the "remember me" choice because
    browsers never echo a cookie's Max-Age back to the server. It is needed to
    keep the same persistence when SimpleJWT rotates the refresh token.
    """
    remember = bool(remember)
    max_age = (
        int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        if remember
        else None
    )
    _set_cookie(response, REFRESH_COOKIE_NAME, token, max_age)
    if remember:
        _set_cookie(response, REMEMBER_COOKIE_NAME, "1", max_age)
    else:
        _expire_cookie(response, REMEMBER_COOKIE_NAME)


def delete_refresh_cookie(response) -> None:
    """Expire the refresh token and its remember-me companion cookie."""
    _expire_cookie(response, REFRESH_COOKIE_NAME)
    _expire_cookie(response, REMEMBER_COOKIE_NAME)


def get_refresh_token(request) -> str | None:
    """Return the refresh token carried in the HttpOnly cookie, if any."""
    return request.COOKIES.get(REFRESH_COOKIE_NAME)


def remember_requested(request) -> bool:
    """Resolve persistence from an explicit body flag or the companion cookie."""
    data = getattr(request, "data", None)
    if hasattr(data, "get") and "remember" in data:
        return bool(data.get("remember"))
    return request.COOKIES.get(REMEMBER_COOKIE_NAME) == "1"


def has_refresh_csrf_header(request) -> bool:
    """A custom header forces a CORS preflight, blocking cross-site form posts."""
    return request.headers.get("X-Requested-With") == "XMLHttpRequest"
