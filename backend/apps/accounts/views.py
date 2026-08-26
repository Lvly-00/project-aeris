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

from .models import PasswordResetCode, EmailChangeCode, TwoFactorCode, TrustedDevice
from .email import send_email
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    VerifyPasswordSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    EmailChangeRequestSerializer,
    EmailChangeVerifySerializer,
    EmailChangeConfirmSerializer,
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

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024  # 5 MB


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Endpoint for the currently logged-in user to see/update their own profile.
    Only first_name, last_name, profile_picture, receive_notifications, and
    preferred_language may be modified.  role, is_active, email, and
    two_factor_enabled are read-only here.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()

        # --- Profile picture validation (FR-PP-003) ---
        picture = request.FILES.get("profile_picture")
        if picture:
            ext = picture.name.rsplit(".", 1)[-1].lower() if "." in picture.name else ""
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                return Response(
                    {"profile_picture": "Unsupported profile picture format. Use JPG, PNG, or WebP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if picture.size > MAX_PROFILE_PICTURE_SIZE:
                return Response(
                    {"profile_picture": "Profile picture exceeds the maximum allowed file size (5 MB)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        response = super().partial_update(request, *args, **kwargs)

        # --- Audit trail (FR-PP-009) ---
        _audit_action(
            user, request, "PROFILE_UPDATED",
            {"fields": list(request.data.keys())},
        )
        return response

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

        # FR-2F-007 — If 2FA is enabled, check if this is a trusted device.
        # Only require 2FA on new/unrecognized devices.
        if user.two_factor_enabled:
            device_id = (request.data.get("device_id") or "").strip()
            is_trusted = (
                device_id
                and TrustedDevice.objects.filter(user=user, device_id=device_id).exists()
            )

            if is_trusted:
                # Trusted device — skip 2FA, issue tokens directly.
                refresh = RefreshToken.for_user(user)
                # Update last_used_at.
                TrustedDevice.objects.filter(user=user, device_id=device_id).update(
                    last_used_at=timezone.now()
                )
                _audit_action(user, request, "LOGIN", {"method": "trusted_device"})
                return Response({
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": UserSerializer(user).data,
                })

            # New device — require 2FA.
            # Invalidate any outstanding 2FA codes.
            user.two_factor_codes.filter(is_used=False).update(is_used=True)

            code = f"{secrets.randbelow(1_000_000):06d}"
            TwoFactorCode.objects.create(
                user=user,
                code_hash=self._two_factor_hash(code),
                expires_at=timezone.now()
                + timedelta(seconds=self.TWO_FACTOR_CODE_TTL_SECONDS),
            )

            if settings.DEBUG:
                logger.info("[DEV] 2FA login code for %s: %s", user.email, code)

            try:
                html_body = (
                    "<p>Hello,</p>"
                    "<p>Use the verification code below to complete your login:</p>"
                    f'<p style="font-size:24px;font-weight:bold;letter-spacing:4px;'
                    f'margin:16px 0">{code}</p>'
                    f"<p>This code expires in "
                    f"{self.TWO_FACTOR_CODE_TTL_SECONDS // 60} minutes. "
                    "If you did not attempt to log in, you can safely "
                    "ignore this email.</p>"
                )
                text_body = (
                    "Hello,\n\n"
                    "Use the verification code below to complete your login:\n\n"
                    f"{code}\n\n"
                    f"This code expires in "
                    f"{self.TWO_FACTOR_CODE_TTL_SECONDS // 60} minutes. "
                    "If you did not attempt to log in, you can safely "
                    "ignore this email.\n"
                )
                send_email(
                    to_email=user.email,
                    subject="Your AERIS login verification code",
                    html_content=html_body,
                    text_content=text_body,
                )
            except Exception:
                logger.warning("2FA login email failed for %s", user.email)

            _audit_action(user, request, "TWO_FACTOR_ENABLED", {"phase": "login_code_sent"})

            return Response({
                "requires_2fa": True,
                "email": user.email,
                "detail": "A verification code has been sent to your email.",
            })

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


    @action(
        detail=False,
        methods=["POST"],
        url_path="login-verify-2fa",
        permission_classes=[permissions.AllowAny],
        authentication_classes=[],
    )
    def login_verify_2fa(self, request):
        """
        Step 2 of 2FA login: verify the 6-digit code and issue tokens.
        POST { "email": "...", "code": "123456" }
        """
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()

        if not email or not code:
            return Response(
                {"detail": "Email and verification code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(code) != 6 or not code.isdigit():
            return Response(
                {"detail": "Enter the complete 6-digit verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code_obj = (
            user.two_factor_codes
            .filter(is_used=False)
            .order_by("-created_at")
            .first()
        )

        if (
            code_obj is None
            or code_obj.is_expired
            or code_obj.is_exhausted
            or not hmac.compare_digest(code_obj.code_hash, self._two_factor_hash(code))
        ):
            if code_obj is not None and not code_obj.is_exhausted:
                code_obj.attempts += 1
                fields = ["attempts"]
                if code_obj.attempts >= self.TWO_FACTOR_MAX_ATTEMPTS:
                    code_obj.is_used = True
                    fields.append("is_used")
                code_obj.save(update_fields=fields)

                remaining = max(0, self.TWO_FACTOR_MAX_ATTEMPTS - code_obj.attempts)
                if remaining == 0:
                    return Response(
                        {"detail": "Too many verification attempts. Please log in again."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response(
                    {"detail": "The verification code is invalid. Please try again.", "attempts_remaining": remaining},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"detail": "This verification code has expired. Please log in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Code is valid — consume it and issue tokens.
        code_obj.is_used = True
        code_obj.save(update_fields=["is_used"])

        # Invalidate other pending codes.
        user.two_factor_codes.filter(is_used=False).update(is_used=True)

        # Save this device as trusted so future logins skip 2FA.
        device_id = (request.data.get("device_id") or "").strip()
        if device_id:
            TrustedDevice.objects.get_or_create(
                user=user,
                device_id=device_id,
                defaults={"label": (request.META.get("HTTP_USER_AGENT") or "")[:200]},
            )

        refresh = RefreshToken.for_user(user)
        _audit_action(user, request, "LOGIN", {"method": "2fa"})
        _audit_action(user, request, "TWO_FACTOR_VERIFIED", {})

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        })

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

    # ── Profile: Change Password (FR-PP-004 / FR-PP-005) ──────────────────────

    @action(detail=False, methods=["POST"], url_path="change-password")
    def change_password(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
            user=request.user,
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        _audit_action(request.user, request, "PASSWORD_CHANGED", {})

        # Invalidate all refresh tokens so the user must re-login.
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            for token in OutstandingToken.objects.filter(user=request.user):
                from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            logger.warning("Could not blacklist tokens for user %s", request.user.email)

        return Response({"detail": "Password changed successfully. Please log in again."})

    # ── Profile: Email Change (FR-PP-010 / FR-PP-011 / FR-PP-012 / FR-PP-013) ─

    EMAIL_CHANGE_CODE_TTL_SECONDS = 300
    EMAIL_CHANGE_MAX_ATTEMPTS = 5

    def _email_change_hash(self, code: str) -> str:
        return hashlib.sha256(
            f"{code}:{settings.SECRET_KEY}".encode()
        ).hexdigest()

    @action(detail=False, methods=["POST"], url_path="email-change/initiate")
    def email_change_initiate(self, request):
        """
        Step 1: Send a verification code to the user's CURRENT email address.
        No new_email needed yet — the user proves identity first.
        """
        user = request.user

        # Invalidate any outstanding email-change codes.
        user.email_change_codes.filter(is_used=False).update(is_used=True)

        code = f"{secrets.randbelow(1_000_000):06d}"
        EmailChangeCode.objects.create(
            user=user,
            new_email="",
            code_hash=self._email_change_hash(code),
            expires_at=timezone.now()
            + timedelta(seconds=self.EMAIL_CHANGE_CODE_TTL_SECONDS),
        )

        if settings.DEBUG:
            logger.info("[DEV] Email change code for %s: %s", user.email, code)

        try:
            html_body = (
                "<p>Hello,</p>"
                "<p>Use the verification code below to confirm your email address change:</p>"
                f'<p style="font-size:24px;font-weight:bold;letter-spacing:4px;'
                f'margin:16px 0">{code}</p>'
                f"<p>This code expires in "
                f"{self.EMAIL_CHANGE_CODE_TTL_SECONDS // 60} minutes. "
                "If you did not request this change, you can safely "
                "ignore this email.</p>"
            )
            text_body = (
                "Hello,\n\n"
                "Use the verification code below to confirm your email address change:\n\n"
                f"{code}\n\n"
                f"This code expires in "
                f"{self.EMAIL_CHANGE_CODE_TTL_SECONDS // 60} minutes. "
                "If you did not request this change, you can safely "
                "ignore this email.\n"
            )
            send_email(
                to_email=user.email,
                subject="Verify your AERIS email change",
                html_content=html_body,
                text_content=text_body,
            )
        except Exception:
            logger.warning("Email change verification email failed for %s", user.email)

        _audit_action(
            user, request, "EMAIL_CHANGE_REQUESTED",
            {},
        )

        return Response(
            {"detail": "Verification code sent to your current email address."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["POST"], url_path="email-change/verify")
    def email_change_verify(self, request):
        """
        Step 2: Verify the 6-digit code (identity check only).
        Does NOT apply the email change — that happens in confirm.
        """
        serializer = EmailChangeVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"]
        user = request.user

        code_obj = (
            user.email_change_codes
            .filter(is_used=False)
            .order_by("-created_at")
            .first()
        )

        if (
            code_obj is None
            or code_obj.is_expired
            or code_obj.is_exhausted
            or not hmac.compare_digest(code_obj.code_hash, self._email_change_hash(code))
        ):
            if code_obj and not code_obj.is_exhausted:
                code_obj.attempts += 1
                fields = ["attempts"]
                if code_obj.attempts >= self.EMAIL_CHANGE_MAX_ATTEMPTS:
                    code_obj.is_used = True
                    fields.append("is_used")
                code_obj.save(update_fields=fields)

            _audit_action(
                user, request, "EMAIL_CHANGE_REQUESTED",
                {"success": False, "reason": "invalid_code"},
            )

            return Response(
                {"detail": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark this code as verified (but don't apply yet — wait for confirm).
        code_obj.verified = True
        code_obj.save(update_fields=["verified"])

        return Response({"detail": "Code verified."})

    @action(detail=False, methods=["POST"], url_path="email-change/confirm")
    def email_change_confirm(self, request):
        """
        Step 3: Apply the email change. Requires new_email + current password.
        The code must have been verified in step 2.
        """
        serializer = EmailChangeConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_email = serializer.validated_data["new_email"].strip().lower()
        password = serializer.validated_data["password"]
        user = request.user

        # Verify current password.
        if not user.check_password(password):
            return Response(
                {"password": "The current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check new email isn't the same.
        if new_email == user.email.lower():
            return Response(
                {"new_email": "New email must be different from current email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check new email isn't taken.
        if User.objects.filter(email__iexact=new_email).exists():
            return Response(
                {"new_email": "This email address is already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find the latest verified, unused code.
        code_obj = (
            user.email_change_codes
            .filter(is_used=False, verified=True)
            .order_by("-created_at")
            .first()
        )

        if code_obj is None or code_obj.is_expired or code_obj.is_exhausted:
            return Response(
                {"detail": "Verification code has expired. Please start over."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Apply the email change (FR-PP-012).
        user.email = new_email
        user.save(update_fields=["email"])

        code_obj.is_used = True
        code_obj.save(update_fields=["is_used"])

        # Invalidate other pending codes.
        user.email_change_codes.filter(is_used=False).update(is_used=True)

        # Blacklist all refresh tokens so the user must re-login with new email.
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            for token in OutstandingToken.objects.filter(user=user):
                from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            logger.warning("Could not blacklist tokens for user %s", user.email)

        _audit_action(user, request, "EMAIL_CHANGE_COMPLETED", {"new_email": new_email})

        return Response({"detail": "Your email address has been successfully updated."})

    # ── Profile: Chief Mode audit (FR-PPD-006) ───────────────────────────────

    @action(detail=False, methods=["POST"], url_path="chief-mode-log")
    def chief_mode_log(self, request):
        entered = request.data.get("entered")
        if not isinstance(entered, bool):
            return Response(
                {"detail": "'entered' must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        action_name = "CHIEF_MODE_ENTERED" if entered else "CHIEF_MODE_EXITED"
        _audit_action(request.user, request, action_name, {})
        return Response({"detail": f"{action_name} logged."})

    # ── Profile: Two-Factor Authentication (FR-2F-001 – FR-2F-009) ──────────

    TWO_FACTOR_CODE_TTL_SECONDS = 300
    TWO_FACTOR_MAX_ATTEMPTS = 5

    def _two_factor_hash(self, code: str) -> str:
        return hashlib.sha256(
            f"{code}:{settings.SECRET_KEY}".encode()
        ).hexdigest()

    @action(detail=False, methods=["POST"], url_path="2fa/send")
    def two_factor_send(self, request):
        """
        Send a 6-digit verification code to the user's email.
        The frontend opens the VerificationCodeModal after this succeeds.
        """
        user = request.user

        # Invalidate any outstanding 2FA codes.
        user.two_factor_codes.filter(is_used=False).update(is_used=True)

        code = f"{secrets.randbelow(1_000_000):06d}"
        TwoFactorCode.objects.create(
            user=user,
            code_hash=self._two_factor_hash(code),
            expires_at=timezone.now()
            + timedelta(seconds=self.TWO_FACTOR_CODE_TTL_SECONDS),
        )

        if settings.DEBUG:
            logger.info("[DEV] 2FA code for %s: %s", user.email, code)

        try:
            html_body = (
                "<p>Hello,</p>"
                "<p>Use the verification code below to verify your identity:</p>"
                f'<p style="font-size:24px;font-weight:bold;letter-spacing:4px;'
                f'margin:16px 0">{code}</p>'
                f"<p>This code expires in "
                f"{self.TWO_FACTOR_CODE_TTL_SECONDS // 60} minutes. "
                "If you did not request this, you can safely "
                "ignore this email.</p>"
            )
            text_body = (
                "Hello,\n\n"
                "Use the verification code below to verify your identity:\n\n"
                f"{code}\n\n"
                f"This code expires in "
                f"{self.TWO_FACTOR_CODE_TTL_SECONDS // 60} minutes. "
                "If you did not request this, you can safely "
                "ignore this email.\n"
            )
            send_email(
                to_email=user.email,
                subject="Your AERIS verification code",
                html_content=html_body,
                text_content=text_body,
            )
        except Exception:
            logger.warning("2FA verification email failed for %s", user.email)
            return Response(
                {"detail": "We could not send the verification code. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        _audit_action(user, request, "TWO_FACTOR_ENABLED", {"phase": "code_sent"})

        return Response(
            {"detail": "Verification code sent to your email address."},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["POST"], url_path="2fa/verify")
    def two_factor_verify(self, request):
        """
        Verify the 6-digit code and toggle two_factor_enabled.
        POST { "code": "123456" }
        """
        code = (request.data.get("code") or "").strip()
        if not code or len(code) != 6 or not code.isdigit():
            return Response(
                {"detail": "Enter the complete 6-digit verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        code_obj = (
            user.two_factor_codes
            .filter(is_used=False)
            .order_by("-created_at")
            .first()
        )

        if (
            code_obj is None
            or code_obj.is_expired
            or code_obj.is_exhausted
            or not hmac.compare_digest(code_obj.code_hash, self._two_factor_hash(code))
        ):
            if code_obj is not None and not code_obj.is_exhausted:
                code_obj.attempts += 1
                fields = ["attempts"]
                if code_obj.attempts >= self.TWO_FACTOR_MAX_ATTEMPTS:
                    code_obj.is_used = True
                    fields.append("is_used")
                code_obj.save(update_fields=fields)

                remaining = max(0, self.TWO_FACTOR_MAX_ATTEMPTS - code_obj.attempts)
                if remaining == 0:
                    return Response(
                        {"detail": "Too many verification attempts. Please return to Login and start a new verification process."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response(
                    {"detail": "The verification code is invalid. Please try again.", "attempts_remaining": remaining},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if code_obj is not None and code_obj.is_exhausted:
                return Response(
                    {"detail": "Too many verification attempts. Please return to Login and start a new verification process."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"detail": "This verification code has expired. Request a new code to continue."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Code is valid — consume it and toggle 2FA.
        code_obj.is_used = True
        code_obj.save(update_fields=["is_used"])

        # Invalidate other pending codes.
        user.two_factor_codes.filter(is_used=False).update(is_used=True)

        # Toggle the flag.
        user.two_factor_enabled = not user.two_factor_enabled
        user.save(update_fields=["two_factor_enabled"])

        action_name = "TWO_FACTOR_ENABLED" if user.two_factor_enabled else "TWO_FACTOR_DISABLED"
        _audit_action(user, request, action_name, {})

        return Response({
            "detail": "Verification successful.",
            "two_factor_enabled": user.two_factor_enabled,
        })