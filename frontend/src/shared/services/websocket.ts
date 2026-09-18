import { getAccessToken } from '../utils/tokenStorage';
import type { QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { playAlertSound } from '../utils/sounds';

// The backend origin for WebSockets. Prefer the explicit WS var, then derive
// it from the API base URL, then fall back to the current origin (dev proxy).
function resolveWsBaseUrl(): string | null {
  const explicit = import.meta.env.VITE_WS_BACKEND_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, '');

  const apiUrl =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    (import.meta.env.VITE_API_URL as string | undefined);

  if (apiUrl) {
    return apiUrl
      .replace(/\/+$/, '')
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:');
  }

  return null;
}

const WS_PATH = '/ws/incidents/';

export interface WSMessage {
  action?: string;
  payload?: any; // The backend sends the incident data inside 'payload'
  priority?: string;
  title?: string;
  message?: string;
  dispatch?: any;
}

export interface WebSocketServiceOptions {
  queryClient: QueryClient;
  onMessage?: (data: WSMessage) => void;
}

/**
 * Subscriber API — lets any component react to WebSocket events without
 * opening its own connection. The single socket in WebSocketService fans
 * every received message out to these listeners.
 */
export type WSListener = (data: WSMessage) => void;

const listeners: Set<WSListener> = new Set();

export function onWebSocketMessage(listener: WSListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(data: WSMessage): void {
  for (const listener of listeners) {
    try {
      listener(data);
    } catch (e) {
      console.error('[WS] Listener error', e);
    }
  }
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly options: WebSocketServiceOptions) { }

  connect(): void {
    const token = getAccessToken();
    if (!token || this.ws) return;

    const wsBaseUrl = resolveWsBaseUrl();
    if (!wsBaseUrl) {
      console.error('[WS] VITE_WS_BACKEND_URL / VITE_BACKEND_URL is not configured');
      return;
    }

    try {
      const socket = new WebSocket(
        `${wsBaseUrl}${WS_PATH}?token=${encodeURIComponent(token)}`
      );
      this.ws = socket;

      socket.onopen = () => {
        console.log('[WS] Connected');
        this.startPing();
      };

      socket.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          this.handleMessage(data);
          this.options.onMessage?.(data);
          notifyListeners(data);
        } catch (e) {
          console.error('[WS] Parse error', e);
        }
      };

      socket.onclose = (event) => {
        this.stopPing();
        if (this.running && event.code !== 4001) {
          console.log('[WS] Disconnected, retrying in 5s...');
          this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (err) {
      console.error('[WS] Connection failed', err);
    }
  }

  disconnect(): void {
    this.running = false;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.ws) {
      // FIX: Prevent "closed before established" error
      // Only close if it's actually open. If it's still connecting, remove handlers.
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      } else {
        this.ws.onmessage = null;
        this.ws.onopen = null;
        this.ws.onerror = null;
        this.ws.close(); // Browser will handle closing the connecting socket silently
      }
      this.ws = null;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  getSocket(): WebSocket | null {
    return this.ws;
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(data: WSMessage): void {
    const { queryClient } = this.options;
    const action = data.action;

    if (action === 'pong') return;

    // Triggered by your Simulate button (incident_created) or status change (incident_update)
    if (action === 'incident_created' || action === 'incident_update') {
      // Invalidating triggers an immediate re-fetch in IncidentsPage.tsx
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Keep the History page in sync when incidents get resolved/dismissed
      queryClient.invalidateQueries({ queryKey: ['incident-history'] });
    }

    if (action === 'notification_new') {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Payload carries the NotificationSerializer data (nested under 'payload').
      const n = data.payload;
      if (n?.priority) playAlertSound(n.priority);
      if (n?.title) {
        notifications.show({
          title: n.title,
          message: n.message || '',
          color: n.priority === 'Critical' ? 'red' : 'orange',
        });
      }
    }

    if (action === 'dispatch_update') {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
    }

    if (action === 'message_new') {
      queryClient.invalidateQueries({ queryKey: ['dispatch-messages'] });
      if (data.payload?.title) {
        notifications.show({
          title: data.payload.title,
          message: data.payload.body || '',
          color: 'orange',
        });
      }
    }
  }
}