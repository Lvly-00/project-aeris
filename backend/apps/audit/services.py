import logging
from typing import Optional

logger = logging.getLogger(__name__)


def write_audit(
    request,
    action,
    user=None,
    resource_type="",
    resource_id=None,
    details=None,
) -> None:
    """Best-effort, single write point for every audit log entry.

    Accepts any action string or ``AuditLog.Action`` member; the model stores
    the displayed value (e.g. ``AuditLog.Action.LOGIN`` is stored as "Login").
    Guards the write so a logging failure never breaks the request that
    triggered it.
    """
    try:
        from apps.audit.models import AuditLog

        entry = AuditLog.objects.create(
            user=user if getattr(user, "is_authenticated", False) else None,
            action=action.value if hasattr(action, "value") else action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=request.META.get("REMOTE_ADDR") or None,
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:500],
            details=details or {},
        )
        broadcast_audit_changed(entry)
    except Exception:
        logger.warning("AuditLog entry failed for action %s", action, exc_info=True)


def broadcast_audit_changed(entry) -> None:
    """Tell connected clients a new audit entry was written so open Audit
    Trail pages refetch without a manual refresh."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return
        async_to_sync(channel_layer.group_send)(
            "incidents",
            {
                "type": "audit_changed",
                "payload": {
                    "id": entry.id,
                    "action": entry.action,
                },
            },
        )
    except Exception:
        logger.debug("Audit WS broadcast failed", exc_info=True)