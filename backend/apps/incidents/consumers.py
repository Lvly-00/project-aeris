import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer


logger = logging.getLogger(__name__)


class IncidentConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.incident_group = "incidents"

        # JWT/auth middleware should populate this
        self.user = self.scope.get("user")

        logger.info(
            "[WS] Incident connection attempt | user=%s",
            self.user,
        )

        if not self.user or self.user.is_anonymous:
            logger.warning("[WS] Unauthorized incident connection")
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(
            self.incident_group,
            self.channel_name,
        )

        await self.accept()

        logger.info(
            "[WS] Incident socket connected | user=%s | channel=%s",
            self.user,
            self.channel_name,
        )

        # Optional confirmation to frontend
        await self.send_json({
            "action": "connected",
            "message": "Incident WebSocket connected",
        })

    async def disconnect(self, close_code):
        logger.info(
            "[WS] Incident socket disconnected | code=%s",
            close_code,
        )

        if hasattr(self, "incident_group"):
            await self.channel_layer.group_discard(
                self.incident_group,
                self.channel_name,
            )

    async def receive_json(self, content, **kwargs):
        action = content.get("action")

        if action == "ping":
            await self.send_json({
                "action": "pong",
            })

    async def incident_created(self, event):
        logger.info("[WS] Broadcasting incident_created")

        await self.send_json({
            "action": "incident_created",
            "payload": event["payload"],
        })

    async def incident_update(self, event):
        logger.info("[WS] Broadcasting incident_update")

        await self.send_json({
            "action": "incident_update",
            "payload": event["payload"],
        })

    async def notification_new(self, event):
        await self.send_json({
            "action": "notification_new",
            "payload": event["payload"],
        })

    async def dispatch_update(self, event):
        await self.send_json({
            "action": "dispatch_update",
            "payload": event.get("payload"),
        })