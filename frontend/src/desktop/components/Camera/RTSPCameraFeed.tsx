/**
 * RTSPCameraFeed — canvas-based JPEG polling feed for RTSP cameras.
 * The AI service owns the cv2 capture and exposes the latest JPEG per camera;
 * this component polls it and paints to a canvas.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Text } from '@mantine/core';
import { Video } from '@boxicons/react';
import { useFps, IDLE_FEED_STATS, CONNECT_TIMEOUT_MS } from './useFps';
import {
  markFeedFailed,
  clearFeedFailure,
  isFeedRecentlyFailed,
} from './feedConnectionCache';
import type { FeedStats, FeedState } from './useFps';
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
  /** Fires when the decoder reports a new pixel size. */
  onSize?: (size: { width: number; height: number }) => void;
}

export function RtspCanvas({ canvasRef, cameraId, baseUrl, onFrame, onStatus, onSize }: RtspCanvasProps) {
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
            const resized =
              canvas.width !== bmp.width || canvas.height !== bmp.height;
            canvas.width = bmp.width;
            canvas.height = bmp.height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(bmp, 0, 0);
            // Always report on the first frame: a fresh canvas defaults to
            // 300x150, which could otherwise match a real source.
            if (resized || !hasDrawnRef.current) {
              onSize?.({ width: bmp.width, height: bmp.height });
            }
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
  }, [cameraId, baseUrl, canvasRef, onFrame, onStatus, onSize]);

  return null;
}

// ── RTSPCameraFeed ────────────────────────────────────────────────────────────

interface RTSPCameraFeedProps {
  camera: any;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
  onStats?: (cameraId: number, stats: FeedStats) => void;
}

export function RTSPCameraFeed({ camera, onIncidentDetected, onStats }: RTSPCameraFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stable ref: an inline `{ current: null }` literal would be a new object on
  // every render, which re-runs DetectionOverlay's polling effect each time
  // (the FPS badge re-renders every second) and starves its 5s interval.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { fps, tick } = useFps();
  const [feed, setFeed] = useState<FeedStatus>({ state: 'connecting' });
  const [stats, setStats] = useState<FeedStats>(IDLE_FEED_STATS);
  // Sticky across remounts (fullscreen wall, navigation): a camera that
  // failed to connect must not re-run its handshake on every visit.
  const [stalled, setStalled] = useState(() =>
    isFeedRecentlyFailed(camera.id, camera.stream_url),
  );

  const baseUrl = (window as any).electronAPI?.isDesktop
    ? (window as any).electronAPI.getAiUrl()
    : '/ai';

  const handleStatus = useCallback((status: FeedStatus) => setFeed(status), []);

  const handleSize = useCallback(
    (size: { width: number; height: number }) =>
      setStats((prev) =>
        prev.width === size.width && prev.height === size.height
          ? prev
          : { ...prev, ...size },
      ),
    [],
  );

  useEffect(() => {
    setFeed({ state: 'connecting' });
    setStats(IDLE_FEED_STATS);
  }, [camera.id]);

  useEffect(() => {
    if (feed.state === 'live') {
      setStalled(false);
      clearFeedFailure(camera.id);
      return;
    }
    if (feed.state === 'error') {
      setStalled(false);
      markFeedFailed(camera.id, camera.stream_url);
      return;
    }
    if (isFeedRecentlyFailed(camera.id, camera.stream_url)) {
      setStalled(true);
      return;
    }
    setStalled(false);
    const t = setTimeout(() => {
      setStalled(true);
      markFeedFailed(camera.id, camera.stream_url);
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [feed.state, camera.id, camera.stream_url]);

  // The RTSP watchdog reports 'error'; the card shows that as OFFLINE.
  const state: FeedState = feed.state === 'error' ? 'offline' : feed.state === 'live' ? 'live' : 'connecting';

  useEffect(() => {
    setStats((prev) =>
      prev.fps === fps && prev.state === state
        ? prev
        : { ...prev, fps, state },
    );
  }, [fps, state]);

  useEffect(() => {
    onStats?.(camera.id, stats);
  }, [stats, onStats, camera.id]);

  const failed = stalled || feed.state === 'error';

  return (
    <Box
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {!failed && (
        <>
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
            onSize={handleSize}
          />
          <DetectionOverlay
            videoRef={videoRef}
            cameraId={camera.id}
            streamType={camera.stream_type}
            source={camera.stream_url}
            cameraName={camera.name}
            onIncidentDetected={onIncidentDetected}
          />
        </>
      )}

      {failed ? (
        <Box
          pos="absolute"
          style={{
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            padding: 12,
            pointerEvents: 'none',
          }}
        >
          <Video width={40} height={40} color="var(--mantine-color-dimmed)" />
          <Text fw={700} size="sm" c="white" mt="xs">Connection failure</Text>
          <Text size="xs" c="var(--mantine-color-dimmed)" mt={4} w="90%" lh={1.5}>
            {feed.state === 'error' && feed.detail
              ? feed.detail
              : 'Unable to connect to the camera source. Verify the configuration and connection.'}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
