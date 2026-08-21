/**
 * RTSPCameraFeed — canvas-based JPEG polling feed for RTSP cameras.
 * Streaming logic (fetch loop, bitmap draw) is unchanged from original.
 */
import { useRef, useEffect } from 'react';
import { Box } from '@mantine/core';
import { FpsOverlay, useFps } from './FpsOverlay';
import { DetectionOverlay } from './DetectionOverlay';
import type { IncidentDetectedData } from './DetectionOverlay';

// ── RtspCanvas — inner polling component ─────────────────────────────────────

interface RtspCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraId: number;
  baseUrl: string;
  onFrame?: () => void;
}

export function RtspCanvas({ canvasRef, cameraId, baseUrl, onFrame }: RtspCanvasProps) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let abortCtrl: AbortController | null = null;

    const fetchAndDraw = async () => {
      while (mountedRef.current) {
        try {
          abortCtrl = new AbortController();
          const res = await fetch(
            `${baseUrl}/cameras/${cameraId}/frame?t=${Date.now()}`,
            { signal: abortCtrl.signal },
          );
          if (!res.ok) {
            await new Promise((r) => setTimeout(r, 1000));
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
          if (onFrame) onFrame();
        } catch (e: any) {
          if (e?.name === 'AbortError') break;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    };

    fetchAndDraw();

    return () => {
      mountedRef.current = false;
      abortCtrl?.abort();
    };
  }, [cameraId, baseUrl, canvasRef, onFrame]);

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
  const { fps, tick } = useFps();

  const baseUrl = (window as any).electronAPI?.isDesktop
    ? (window as any).electronAPI.getAiUrl()
    : '/ai';

  return (
    <Box
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <RtspCanvas canvasRef={canvasRef} cameraId={camera.id} baseUrl={baseUrl} onFrame={tick} />
      <FpsOverlay fps={fps} />
      <DetectionOverlay
        videoRef={{ current: null }}
        cameraId={camera.id}
        streamType={camera.stream_type}
        source={camera.stream_url}
        cameraName={camera.name}
        onIncidentDetected={onIncidentDetected}
      />
    </Box>
  );
}
