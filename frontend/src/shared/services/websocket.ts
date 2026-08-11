/**
 * WebSocket service — connection lifecycle, reconnect, and ping logic.
 *
 * This module owns the raw WebSocket management. useWebSocket.ts is a
 * thin React hook that calls this service and wires it to React Query.
 */
import type { QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { playAlertSound } from '../utils/sounds';

const WS_BASE = 'ws://localhost:8000/ws/incidents/';

export interface WSMessage {
  action?: string;
  incident_type?: string;
  severity?: string;
  priority?: string;
  title?: string;
  message?: string;
  dispatch?: any;
}

export interface WebSocketServiceOptions {
  queryClient: QueryClient;
  onMessage?: (data: WSMessage) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly options: WebSocketServiceOptions) {}

  connect(): void {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const socket = new WebSocket(`${WS_BASE}?token=${token}`);
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
        } catch {
          // ignore parse errors
        }
      };

      socket.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code);
        this.stopPing();
        if (this.running && event.code !== 4001) {
          this.reconnectTimer = setTimeout(() => this.connect(), 5000);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      if (this.running) {
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      }
    }
  }

  disconnect(): void {
    this.running = false;
    this.stopPing();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
  }

  start(): void {
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

    if (data.incident_type || action === 'incident_created' || action === 'incident_update') {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['incident-summary'] });
    }

    if (action === 'notification_new') {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
      if (data.priority) playAlertSound(data.priority);
      if (data.title) {
        notifications.show({
          title: data.title,
          message: data.message || '',
          color:
            data.priority === 'Critical'
              ? 'red'
              : data.priority === 'High'
              ? 'orange'
              : 'blue',
          autoClose: 8000,
        });
      }
    }

    if (action === 'dispatch_update' || data.dispatch) {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['dispatchers'] });
      queryClient.invalidateQueries({ queryKey: ['incidents-pending'] });
    }
  }
}
