import type { QueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { playAlertSound } from '../utils/sounds';

// 1. Use relative path so Vite's proxy handles the upgrade automatically
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

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly options: WebSocketServiceOptions) {}

  connect(): void {
    const token = localStorage.getItem('access_token');
    if (!token || this.ws) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Connect to window.location.host (Vite port 5173) 
      // Vite forwards this to 8000 because of your vite.config.ts proxy
      const socket = new WebSocket(`${protocol}://${window.location.host}${WS_PATH}?token=${token}`);
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
    }

    if (action === 'notification_new') {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (data.priority) playAlertSound(data.priority);
      if (data.title) {
        notifications.show({
          title: data.title,
          message: data.message || '',
          color: data.priority === 'Critical' ? 'red' : 'orange',
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