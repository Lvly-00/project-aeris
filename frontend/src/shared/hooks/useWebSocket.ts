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

    return () => {
      service.disconnect();
      serviceRef.current = null;
    };
  }, [isAuthenticated, queryClient]);

  // Expose the raw socket ref for callers that need to send messages directly
  return {
    getSocket: () => serviceRef.current?.getSocket() ?? null,
  };
}
