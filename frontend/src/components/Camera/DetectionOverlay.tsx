/**
 * DetectionOverlay — canvas drawn over the camera feed showing bounding boxes.
 *
 * Polling logic (5 s interval, staggered by camera_id) and incident creation
 * are unchanged from the original CameraMonitoringPage implementation.
 */
import { useRef, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import { aiAPI } from '../../services/aiApi';
import { incidentsAPI } from '../../services/api';

export const SEVERITY_COLORS: Record<string, string> = {
  Fire: '#FF0000',
  Smoke: '#FF8800',
  Vehicle_Accident: '#FFD700',
  Person: '#00CCFF',
  Car: '#FFD700',
};

export const VALID_INCIDENT_TYPES = new Set(['Fire', 'Smoke', 'Vehicle_Accident']);

export interface IncidentDetectedData {
  incidentType: string;
  confidence: number;
  evidenceUrl: string;
  cameraId: number;
  cameraName: string;
}

export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: any[],
  w: number,
  h: number,
  clearBg = true,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (clearBg) ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sx = canvas.width / w;
  const sy = canvas.height / h;
  for (const d of detections) {
    if (!VALID_INCIDENT_TYPES.has(d.incident_type)) continue;
    const [x1, y1, x2, y2] = d.bbox || [0, 0, 0, 0];
    const color = SEVERITY_COLORS[d.incident_type] || '#FFFFFF';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);
    ctx.fillStyle = color;
    const label = `${d.incident_type} ${(d.confidence * 100).toFixed(0)}%`;
    ctx.font = 'bold 14px sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillRect(x1 * sx, y1 * sy - 22, tw + 10, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, x1 * sx + 5, y1 * sy - 6);
  }
}

interface DetectionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraId: number;
  streamType: string;
  source?: string;
  cameraName?: string;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
}

export function DetectionOverlay({
  videoRef,
  cameraId,
  streamType,
  source,
  cameraName,
  onIncidentDetected,
}: DetectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionsRef = useRef<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportedTypes = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const detectAndCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isRtsp = streamType === 'RTSP';

    if (!isRtsp && (!video || video.readyState < 2)) return;

    const w = isRtsp ? canvas.clientWidth : video!.videoWidth || video!.clientWidth;
    const h = isRtsp ? canvas.clientHeight : video!.videoHeight || video!.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w;
    canvas.height = h;

    try {
      let allDetections: any[] = [];

      if (isRtsp) {
        const res = await aiAPI.detectOnCamera(cameraId);
        allDetections = res.data || [];
        if (Array.isArray(allDetections) && allDetections.length > 0 && allDetections[0].detections) {
          allDetections = allDetections[0].detections;
        }
      } else {
        const temp = document.createElement('canvas');
        temp.width = w;
        temp.height = h;
        const ctx = temp.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video!, 0, 0, w, h);
        const blob = await new Promise<Blob | null>((resolve) => temp.toBlob(resolve, 'image/jpeg', 0.7));
        if (!blob) return;
        const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
        const res = await aiAPI.detectFrame(file, cameraId);
        allDetections = res.data || [];
      }

      detectionsRef.current = allDetections.filter(
        (d: any) => d.camera_id > 0 && d.camera_id === cameraId,
      );
      drawDetections(canvas, detectionsRef.current, w, h);
      if (detectionsRef.current.length === 0) return;

      let evidenceBlob: Blob | null = null;

      if (isRtsp) {
        const frameRes = await aiAPI.getFrame(cameraId);
        const rawBlob = frameRes.data as Blob;
        const img = await createImageBitmap(rawBlob);
        const evCanvas = document.createElement('canvas');
        evCanvas.width = img.width;
        evCanvas.height = img.height;
        const evCtx = evCanvas.getContext('2d');
        if (evCtx) {
          evCtx.drawImage(img, 0, 0);
          drawDetections(evCanvas, detectionsRef.current, img.width, img.height, false);
          evidenceBlob = await new Promise<Blob | null>((resolve) =>
            evCanvas.toBlob(resolve, 'image/jpeg', 0.85),
          );
        }
      } else {
        const evCanvas = document.createElement('canvas');
        evCanvas.width = w;
        evCanvas.height = h;
        const ectx = evCanvas.getContext('2d');
        if (!ectx) return;
        ectx.drawImage(video!, 0, 0, w, h);
        drawDetections(evCanvas, detectionsRef.current, w, h, false);
        evidenceBlob = await new Promise<Blob | null>((resolve) =>
          evCanvas.toBlob(resolve, 'image/jpeg', 0.85),
        );
      }

      if (!evidenceBlob) return;
      const evidenceFile = new File([evidenceBlob], 'evidence.jpg', { type: 'image/jpeg' });

      for (const d of detectionsRef.current) {
        const key = `${d.incident_type}-${cameraId}`;
        if (d.confidence > 0.3 && VALID_INCIDENT_TYPES.has(d.incident_type) && !reportedTypes.current.has(key)) {
          try {
            const fd = new FormData();
            fd.append('incident_type', d.incident_type);
            fd.append('confidence_score', String(d.confidence));
            fd.append('camera_id', String(cameraId));
            fd.append('bbox', JSON.stringify(d.bbox));
            fd.append('evidence', evidenceFile, 'evidence.jpg');
            if (d.crowd_size != null) fd.append('crowd_size', String(d.crowd_size));
            await incidentsAPI.createFromDetection(fd);
            reportedTypes.current.add(key);
            if (onIncidentDetected) {
              const evUrl = URL.createObjectURL(evidenceBlob);
              onIncidentDetected({
                incidentType: d.incident_type,
                confidence: d.confidence,
                evidenceUrl: evUrl,
                cameraId,
                cameraName: cameraName || `Camera #${cameraId}`,
              });
            }
          } catch (err) {
            console.warn('Failed to create incident from detection:', err);
          }
        }
      }
    } catch {
      const ctx2 = canvasRef.current?.getContext('2d');
      if (ctx2) ctx2.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    }
  }, [cameraId, streamType, videoRef, cameraName, onIncidentDetected]);

  const scheduleNext = useCallback(() => {
    intervalRef.current = setTimeout(async () => {
      await detectAndCapture();
      if (mountedRef.current) scheduleNext();
    }, 5000);
  }, [detectAndCapture]);

  useEffect(() => {
    mountedRef.current = true;
    const stagger = (cameraId % 5) * 1000;
    const initTimeout = setTimeout(() => {
      detectAndCapture();
      scheduleNext();
    }, stagger);
    return () => {
      mountedRef.current = false;
      clearTimeout(initTimeout);
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [cameraId, streamType, detectAndCapture, scheduleNext]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
