import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class IncidentConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if self.user is None or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        self.incident_group = "incidents"
        await self.channel_layer.group_add(self.incident_group, self.channel_name)
        await self.accept()
        logger.info("WebSocket connected: user=%s", self.user.username)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.incident_group, self.channel_name)
        logger.info("WebSocket disconnected: code=%s", close_code)

    async def receive_json(self, content):
        action = content.get("action")
        if action == "ping":
            await self.send_json({"action": "pong"})

    async def incident_update(self, event):
        await self.send_json(event["payload"])

    async def incident_created(self, event):
        await self.send_json(event["payload"])

    async def notification_new(self, event):
        await self.send_json(event["payload"])

    async def dispatch_update(self, event):
        await self.send_json({
            "action": event.get("action", "dispatch_update"),
            "dispatch": event.get("payload"),
        })
