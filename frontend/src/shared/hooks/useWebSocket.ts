import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketService } from '../services/websocket';

/**
 * Connects the WebSocket service to React's lifecycle.
 * All connection logic lives in services/websocket.ts;
 * this hook just starts/stops the service when auth state changes.
 */
export function useWebSocket(isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const serviceRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const service = new WebSocketService({ queryClient });
    serviceRef.current = service;
    service.start();

    /*
     * Mobile browsers freeze timers and can drop the socket while the PWA is
     * backgrounded. Re-open it as soon as the app is visible again so the
     * Incidents page receives new events immediately instead of waiting for
     * the polling fallback.
     */
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') service.connect();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      service.disconnect();
      serviceRef.current = null;
    };
  }, [isAuthenticated, queryClient]);

  // Expose the raw socket ref for callers that need to send messages directly
  return {
    getSocket: () => serviceRef.current?.getSocket() ?? null,
  };
}
