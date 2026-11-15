import json
import logging
import django.db.models as models
from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import Notification, PushSubscription
from .serializers import NotificationSerializer, NotificationMarkReadSerializer

logger = logging.getLogger(__name__)


# ── Web Push helpers ──────────────────────────────────────────────────────────

def _load_vapid_private_key() -> str:
    """Return the VAPID private key PEM string with actual newlines."""
    raw = getattr(settings, "VAPID_PRIVATE_KEY", "")
    # Support both literal \n (from .env files) and real newlines
    return raw.replace("\\n", "\n")


def send_push_notification(subscription: "PushSubscription", payload: dict) -> bool:
    """
    Send a single Web Push notification to one subscription.

    Returns True on success, False on failure.
    On a 410 Gone response the subscription is deleted automatically
    (the user revoked permission or the browser recycled the endpoint).
    """
    private_key_pem = _load_vapid_private_key()
    public_key = getattr(settings, "VAPID_PUBLIC_KEY", "")
    claims_sub = getattr(settings, "VAPID_CLAIMS_SUB", "mailto:admin@example.com")

    if not private_key_pem or not public_key:
        logger.warning("[PUSH] VAPID keys not configured — skipping push")
        return False

    try:
        from pywebpush import webpush, WebPushException

        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=private_key_pem,
            vapid_claims={
                "sub": claims_sub,
            },
        )
        return True

    except Exception as exc:
        # 410 Gone — subscription is no longer valid; remove it.
        gone = False
        try:
            from pywebpush import WebPushException
            if isinstance(exc, WebPushException) and exc.response is not None:
                gone = exc.response.status_code in (404, 410)
        except Exception:
            pass

        if gone:
            logger.info(
                "[PUSH] Subscription %s gone (410) — deleting", subscription.endpoint[:60]
            )
            subscription.delete()
        else:
            logger.warning("[PUSH] Push failed for %s: %s", subscription.endpoint[:60], exc)
        return False


def push_to_user(user, payload: dict) -> int:
    """
    Deliver a push notification to every active subscription for `user`.
    Returns the number of successful deliveries.
    """
    subs = PushSubscription.objects.filter(user=user)
    if not subs.exists():
        return 0

    delivered = 0
    for sub in subs:
        if send_push_notification(sub, payload):
            delivered += 1
    return delivered


# ── REST views ────────────────────────────────────────────────────────────────

class VapidPublicKeyView(APIView):
    """
    GET /api/notifications/vapid-public-key/
    Returns the VAPID public key so the frontend can subscribe.
    No auth required — the key is public by design.
    """
    permission_classes = []

    def get(self, request):
        return Response({"vapid_public_key": getattr(settings, "VAPID_PUBLIC_KEY", "")})


class PushSubscriptionView(APIView):
    """
    POST   /api/notifications/push-subscription/   — save a subscription
    DELETE /api/notifications/push-subscription/   — remove a subscription
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        endpoint = request.data.get("endpoint")
        p256dh = request.data.get("p256dh")
        auth = request.data.get("auth")

        if not endpoint or not p256dh or not auth:
            return Response({"error": "endpoint, p256dh and auth are required"}, status=400)

        sub, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": request.user,
                "p256dh": p256dh,
                "auth": auth,
            },
        )
        status_code = 201 if created else 200
        logger.info(
            "[PUSH] Subscription %s for user %s",
            "created" if created else "updated",
            request.user.email,
        )
        return Response({"status": "ok"}, status=status_code)

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        if not endpoint:
            return Response({"error": "endpoint is required"}, status=400)

        deleted, _ = PushSubscription.objects.filter(
            user=request.user, endpoint=endpoint
        ).delete()
        logger.info(
            "[PUSH] Deleted %d subscription(s) for user %s", deleted, request.user.email
        )
        return Response({"deleted": deleted})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["is_read", "notification_type", "priority"]

    def get_queryset(self):
        qs = Notification.objects.select_related(
            "incident", "incident__camera", "incident__incident_type"
        ).all()
        user = self.request.user
        # Strictly role-scoped: users only see notifications addressed to them.
        qs = qs.filter(models.Q(recipient=user))
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        return qs

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request) -> Response:
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        qs = self.get_queryset()
        if serializer.validated_data.get("all"):
            count = qs.filter(is_read=False).update(is_read=True)
        else:
            ids = serializer.validated_data.get("ids", [])
            count = qs.filter(id__in=ids, is_read=False).update(is_read=True)
        logger.info("Marked %d notifications as read for user %s", count, request.user.email)
        return Response({"marked_read": count})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request) -> Response:
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        logger.info(
            "Marked all %d notifications as read for user %s",
            count, request.user.email,
        )
        return Response({"marked_read": count})

    @action(detail=False, methods=["get"], url_path="unread_count")
    def unread_count(self, request) -> Response:
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read_single(self, request, pk=None) -> Response:
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)
