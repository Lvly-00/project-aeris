/**
 * RTSPCameraFeed — canvas-based JPEG polling feed for RTSP cameras.
 * The AI service owns the cv2 capture and exposes the latest JPEG per camera;
 * this component polls it and paints to a canvas.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Text } from '@mantine/core';
import { Video } from '@boxicons/react';
import { FpsOverlay, useFps } from './FpsOverlay';
import { DetectionOverlay } from './DetectionOverlay';
import type { IncidentDetectedData } from './DetectionOverlay';

/**
 * How long to wait for a first frame before surfacing a failure.
 * Generous, because the AI service may still be opening the RTSP source
 * (or backing off after a failed attempt) when the page loads.
 */
const FIRST_FRAME_TIMEOUT_MS = 25000;

interface FeedStatus {
  state: 'connecting' | 'live' | 'error';
  detail?: string;
}

// ── RtspCanvas — inner polling component ─────────────────────────────────────

interface RtspCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraId: number;
  baseUrl: string;
  onFrame?: () => void;
  onStatus?: (status: FeedStatus) => void;
}

export function RtspCanvas({ canvasRef, cameraId, baseUrl, onFrame, onStatus }: RtspCanvasProps) {
  const mountedRef = useRef(true);
  const hasDrawnRef = useRef(false);
  const lastErrorRef = useRef('');

  useEffect(() => {
    mountedRef.current = true;
    hasDrawnRef.current = false;
    lastErrorRef.current = '';
    let abortCtrl: AbortController | null = null;
    let watchdog: ReturnType<typeof setTimeout> | null = null;

    const clearWatchdog = () => {
      if (watchdog !== null) {
        clearTimeout(watchdog);
        watchdog = null;
      }
    };

    // If no frame ever lands the fetch loop just keeps retrying, which renders
    // as an endless "Connecting..." with no explanation. Report it instead.
    const armWatchdog = () => {
      clearWatchdog();
      watchdog = setTimeout(() => {
        if (!mountedRef.current || hasDrawnRef.current) return;
        onStatus?.({
          state: 'error',
          detail:
            lastErrorRef.current ||
            `No frames received within ${FIRST_FRAME_TIMEOUT_MS / 1000}s. ` +
            `Check that the AI service is running and the camera source is reachable.`,
        });
      }, FIRST_FRAME_TIMEOUT_MS);
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const fetchAndDraw = async () => {
      armWatchdog();
      while (mountedRef.current) {
        try {
          abortCtrl = new AbortController();
          const res = await fetch(
            `${baseUrl}/cameras/${cameraId}/frame?t=${Date.now()}`,
            { signal: abortCtrl.signal },
          );
          if (!res.ok) {
            lastErrorRef.current = `Frame request failed: HTTP ${res.status} ${res.statusText}`.trim();
            await sleep(1000);
            continue;
          }
          const blob = await res.blob();
          if (!mountedRef.current) break;
          const bmp = await createImageBitmap(blob);
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = bmp.width;
            canvas.height = bmp.height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(bmp, 0, 0);
          }
          bmp.close();
          if (!mountedRef.current) break;
          if (!hasDrawnRef.current) {
            hasDrawnRef.current = true;
            onStatus?.({ state: 'live' });
          }
          if (onFrame) onFrame();
        } catch (e: any) {
          if (e?.name === 'AbortError') break;
          lastErrorRef.current = e?.message
            ? `Frame request error: ${e.message}`
            : 'Frame request error';
          await sleep(500);
        }
      }
    };

    fetchAndDraw();

    return () => {
      mountedRef.current = false;
      clearWatchdog();
      abortCtrl?.abort();
    };
  }, [cameraId, baseUrl, canvasRef, onFrame, onStatus]);

  return null;
}

// ── RTSPCameraFeed ────────────────────────────────────────────────────────────

interface RTSPCameraFeedProps {
  camera: any;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
}

export function RTSPCameraFeed({ camera, onIncidentDetected }: RTSPCameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stable ref: an inline `{ current: null }` literal would be a new object on
  // every render, which re-runs DetectionOverlay's polling effect each time
  // (the FPS badge re-renders every second) and starves its 5s interval.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { fps, tick } = useFps();
  const [feed, setFeed] = useState<FeedStatus>({ state: 'connecting' });

  const baseUrl = (window as any).electronAPI?.isDesktop
    ? (window as any).electronAPI.getAiUrl()
    : '/ai';

  const handleStatus = useCallback((status: FeedStatus) => setFeed(status), []);

  useEffect(() => {
    setFeed({ state: 'connecting' });
  }, [camera.id]);

  return (
    <Box
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <RtspCanvas
        canvasRef={canvasRef}
        cameraId={camera.id}
        baseUrl={baseUrl}
        onFrame={tick}
        onStatus={handleStatus}
      />

      {feed.state === 'error' && (
        <Box
          pos="absolute"
          style={{
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Video width={48} height={48} color="var(--mantine-color-dimmed)" />
          <Text size="xs" c="dimmed" mt="xs">Stream unavailable</Text>
          {feed.detail && (
            <Text size="xs" c="red" mt={4} style={{ wordBreak: 'break-word' }}>
              {feed.detail}
            </Text>
          )}
        </Box>
      )}

      <FpsOverlay fps={fps} />
      <DetectionOverlay
        videoRef={videoRef}
        cameraId={camera.id}
        streamType={camera.stream_type}
        source={camera.stream_url}
        cameraName={camera.name}
        onIncidentDetected={onIncidentDetected}
      />
    </Box>
  );
}
