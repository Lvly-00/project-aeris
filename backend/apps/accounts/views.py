import hashlib
import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetCode
from .email import send_email
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    VerifyPasswordSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Matches the frontend countdown (VerificationCodePage: CODE_TTL_SECONDS).
PASSWORD_RESET_CODE_TTL_SECONDS = 300
# Wrong-code attempts allowed before the code is invalidated.
PASSWORD_RESET_MAX_ATTEMPTS = 5


def _hash_code(code: str) -> str:
    """SHA-256 of the code peppered with SECRET_KEY — plaintext is never stored."""
    return hashlib.sha256(f"{code}:{settings.SECRET_KEY}".encode()).hexdigest()


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


class LoginRateThrottle(AnonRateThrottle):
    """Per-client rate limit for authentication endpoints (scope: 'login')."""

    scope = "login"


def _audit_action(user, request, action: str, details: dict | None = None) -> None:
    """Best-effort audit trail entry for authentication events."""
    try:
        from apps.audit.models import AuditLog

        AuditLog.objects.create(
            user=user,
            action=action,
            resource_type="Auth",
            ip_address=request.META.get("REMOTE_ADDR") or None,
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:500],
            details=details or {},
        )
    except Exception:
        logger.warning("AuditLog entry failed for action %s", action)


class RegisterView(generics.CreateAPIView):
    """
    Endpoint for creating new users. 
    Typically used by Admins in a management dashboard.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    # In a production admin panel, you might change this to IsAdminUser
    permission_classes = [permissions.AllowAny] 

    def create(self, request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Endpoint for the currently logged-in user to see/update their own profile.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserViewSet(viewsets.ModelViewSet):
    """
    A viewset that provides default `list`, `create`, `retrieve`,
    `update`, `partial_update`, and `destroy` actions.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    authentication_classes = [JWTAuthentication] 
    permission_classes = [permissions.IsAuthenticated]

    # Actions that must be fully public — no JWT, no auth required.
    # Note: get_authenticators() is called BEFORE self.action is set, so we
    # match on the request path instead.
    PUBLIC_URL_SEGMENTS = frozenset({
        "login", "logout", "password-reset",
        "password-reset-verify", "password-reset-confirm",
        "dispatchers",
    })

    # Paths that must bypass JWT authentication and IsAuthenticated checks.
    # get_authenticators() is called BEFORE self.action is set, so we match on
    # the request path (available as self.request.path at that point).
    _PUBLIC_PATH_MARKERS = (
        "/login",
        "/password-reset",
        "/dispatchers",
    )

    def _is_public_action(self) -> bool:
        try:
            path = self.request.path
        except AttributeError:
            return False
        return any(m in path for m in self._PUBLIC_PATH_MARKERS)

    def get_permissions(self):
        if self._is_public_action():
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_authenticators(self):
        if self._is_public_action():
            return []
        return super().get_authenticators()

    def list(self, request):
        qs = self.get_queryset()
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role__name=role)
        
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        Handles PUT requests.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Permission Check: Only Admins can edit other users
        if request.user != instance and not request.user.is_admin():
            return Response({"error": "Only admins can update other users"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """
        Handles PATCH requests. This was the missing link causing the 405 error.
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, pk=None):
        """
        Handles DELETE requests. Performs a 'Soft Delete' by deactivating the user.
        """
        if not request.user.is_admin():
            return Response({"error": "Only admins can delete users"}, status=status.HTTP_403_FORBIDDEN)
            
        user = self.get_object()
        if user == request.user:
            return Response({"error": "Cannot delete yourself"}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_active = False
        user.save()
        
        # Logging the action
        try:
            from apps.audit.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                action="USER_DEACTIVATED", # Matches your AuditLog choices
                resource_type="User",
                resource_id=user.id,
                details={"deactivated_user": user.email},
            )
        except ImportError:
            logger.warning("AuditLog model not found; skipping log entry.")

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_throttles(self):
        # Stricter per-client rate limit on authentication endpoints (FR-LG-009,
        # NFR-LG-007) — protects against brute force and credential stuffing.
        if self.action in (
            "login",
            "password_reset",
            "password_reset_verify",
            "password_reset_confirm",
        ):
            return [LoginRateThrottle()]
        return super().get_throttles()

    # --- CUSTOM ACTIONS ---

    @action(
        detail=False,
        methods=["POST"],
        url_path="login",
        permission_classes=[permissions.AllowAny],
        authentication_classes=[],
    )
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]

        user = authenticate(request, email=email, password=password)

        if user is None:
            # FR-LG-008 — record the failed attempt for the audit trail.
            # Brute-force protection relies solely on the per-client rate
            # limit (5 requests/minute → HTTP 429 "time out").
            known_user = User.objects.filter(email__iexact=email).first()
            _audit_action(known_user, request, "LOGIN_FAILED", {"email": email})
            # NFR-LG-009 — identical response whether the email or password is wrong
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            _audit_action(user, request, "LOGIN_FAILED", {"reason": "account_disabled"})
            return Response(
                {"detail": "User account is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # FR-LG-008 — record successful authentication
        refresh = RefreshToken.for_user(user)
        _audit_action(user, request, "LOGIN", {})

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        })

    @action(detail=False, methods=["POST"], url_path="logout")
    def logout(self, request):
        # FR-LG-012 — invalidate the session: blacklist the refresh token so it
        # can never be exchanged for a new access token again. Remaining access
        # tokens expire naturally (30-minute lifetime).
        refresh_token = (
            request.data.get("refresh") if isinstance(request.data, dict) else None
        )
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass  # token already expired/blacklisted — nothing to invalidate

        _audit_action(request.user, request, "LOGOUT", {})
        return Response({"detail": "Logged out successfully"})

    @action(
        detail=False,
        methods=["POST"],
        url_path="password-reset",
        permission_classes=[permissions.AllowAny],
        authentication_classes=[],
    )
    def password_reset(self, request):
        """
        Password reset request (FR-LG-003 / FR-LG-015 / NFR-LG-003).
        The response is IDENTICAL whether or not the account exists, so the
        endpoint can never be used to enumerate registered users.

        For known accounts a single-use 6-digit code is generated (only its
        hash is stored) and emailed via EMAIL_BACKEND — currently the console
        backend until SMTP credentials are added.
        """
        requested_for = ""
        user = None
        if isinstance(request.data, dict):
            requested_for = (request.data.get("email") or "").strip().lower()
        if requested_for:
            user = User.objects.filter(email__iexact=requested_for).first()

        if user is not None:
            # Invalidate any outstanding codes before issuing a fresh one.
            user.password_reset_codes.filter(is_used=False).update(is_used=True)
            code = _generate_code()
            PasswordResetCode.objects.create(
                user=user,
                code_hash=_hash_code(code),
                expires_at=timezone.now()
                + timedelta(seconds=PASSWORD_RESET_CODE_TTL_SECONDS),
            )
            # Dev-only: log the plaintext code so the team can smoke-test
            # without mailbox access. This is harmless in production where
            # settings.DEBUG is False.
            if settings.DEBUG:
                logger.info("[DEV] Password reset code for %s: %s", user.email, code)
            try:
                html_body = (
                    "<p>Hello,</p>"
                    "<p>Use the verification code below to reset your AERIS password:</p>"
                    f'<p style="font-size:24px;font-weight:bold;letter-spacing:4px;'
                    f'margin:16px 0">{code}</p>'
                    f"<p>This code expires in "
                    f"{PASSWORD_RESET_CODE_TTL_SECONDS // 60} minutes. "
                    "If you did not request a password reset, you can safely "
                    "ignore this email.</p>"
                )
                text_body = (
                    "Hello,\n\n"
                    "Use the verification code below to reset your AERIS password:\n\n"
                    f"{code}\n\n"
                    f"This code expires in "
                    f"{PASSWORD_RESET_CODE_TTL_SECONDS // 60} minutes. "
                    "If you did not request a password reset, you can safely "
                    "ignore this email.\n"
                )
                send_email(
                    to_email=user.email,
                    subject="Your AERIS password reset code",
                    html_content=html_body,
                    text_content=text_body,
                )
            except Exception:
                logger.warning("Password reset email failed for %s", user.email)

        _audit_action(user, request, "PASSWORD_RESET_REQUESTED", {"requested_for": requested_for})

        return Response({
            "detail": (
                "If an account exists for the provided information, "
                "password reset instructions will be sent."
            )
        })

    def _get_active_code(self, email: str) -> PasswordResetCode | None:
        """Latest unused, unexpired, non-exhausted code for the given email."""
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return None
        code = (
            user.password_reset_codes.filter(is_used=False)
            .order_by("-created_at")
            .first()
        )
        if code is None or code.is_expired or code.is_exhausted:
            return None
        return code

    def _mark_code_used(self, reset_code: PasswordResetCode) -> None:
        reset_code.is_used = True
        reset_code.save(update_fields=["is_used"])
        # Any older outstanding codes are now moot as well.
        reset_code.user.password_reset_codes.filter(is_used=False).update(is_used=True)

    @action(
        detail=False,
        methods=["POST"],
        url_path="password-reset/verify",
        permission_classes=[permissions.AllowAny],
        authentication_classes=[],
    )
    def password_reset_verify(self, request):
        """
        Step 2 of the forgot-password flow: check the 6-digit code.
        Wrong/expired codes share one generic message; repeated wrong codes
        exhaust the attempt budget and invalidate the code.
        """
        serializer = PasswordResetVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"]

        reset_code = self._get_active_code(email)
        if reset_code is None or not hmac.compare_digest(reset_code.code_hash, _hash_code(code)):
            if reset_code is not None:
                reset_code.attempts += 1
                update_fields = ["attempts"]
                if reset_code.attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
                    reset_code.is_used = True
                    update_fields.append("is_used")
                reset_code.save(update_fields=update_fields)
            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "Code verified."})

    @action(
        detail=False,
        methods=["POST"],
        url_path="password-reset/confirm",
        permission_classes=[permissions.AllowAny],
        authentication_classes=[],
    )
    def password_reset_confirm(self, request):
        """
        Step 3 of the forgot-password flow: re-validate the code and set the
        new password. The code is consumed so it can never be replayed.
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"]
        password = serializer.validated_data["password"]

        reset_code = self._get_active_code(email)
        if reset_code is None or not hmac.compare_digest(reset_code.code_hash, _hash_code(code)):
            if reset_code is not None:
                reset_code.attempts += 1
                update_fields = ["attempts"]
                if reset_code.attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
                    reset_code.is_used = True
                    update_fields.append("is_used")
                reset_code.save(update_fields=update_fields)
            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = reset_code.user
        user.set_password(password)
        user.save(update_fields=["password"])

        self._mark_code_used(reset_code)
        _audit_action(user, request, "PASSWORD_RESET_COMPLETED", {"email": user.email})

        return Response({"detail": "Password has been reset."})


    @action(detail=False, methods=["GET"], url_path="dispatchers")
    def dispatchers(self, request):
        users = User.objects.filter(
            role__name__in=["Barangay Tanod", "CCTV Chief", "CCTV Operator"],
            is_active=True,
        )
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["POST"], url_path="verify-password")
    def verify_password(self, request):
        serializer = VerifyPasswordSerializer(
            data=request.data, 
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"detail": "Password verified successfully"}, status=status.HTTP_200_OK)