/**
 * CameraFeed — dispatches to the right feed component based on stream_type.
 * HTTP/MP4 cameras use a <video> element; RTSP uses the canvas polling path.
 */
import { useRef } from 'react';
import { Box, Text } from '@mantine/core';
import { Video } from '@boxicons/react';
import { FpsOverlay, useFps } from './FpsOverlay';
import { DetectionOverlay } from './DetectionOverlay';
import { RTSPCameraFeed } from './RTSPCameraFeed';
import { useCameraFeed } from '../../../shared/hooks/useCameraFeed';
import type { IncidentDetectedData } from './DetectionOverlay';

interface CameraFeedProps {
  camera: any;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
}

export function CameraFeed({ camera, onIncidentDetected }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { fps, tick } = useFps();

  // Shared hook resolves the token from localStorage *and* sessionStorage, so
  // MP4 keeps working when the user logged in without "Remember Me".
  const { streamUrl, hasError, errorMsg, handleError } = useCameraFeed({
    cameraId: camera.id,
    streamType: camera.stream_type,
  });

  if (camera.stream_type === 'EMBED') {
    return (
      <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          src={camera.stream_url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin allow-popups"
          allowFullScreen
          title={camera.name}
        />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Box ta="center" p="md">
        <Video  width={48} height={48} color="var(--mantine-color-dimmed)" />
        <Text size="xs" c="dimmed" mt="xs">Stream unavailable</Text>
        {errorMsg && (
          <Text size="xs" c="red" mt={4} style={{ wordBreak: 'break-all' }}>
            {errorMsg}
          </Text>
        )}
      </Box>
    );
  }

  if (camera.stream_type === 'RTSP') {
    return <RTSPCameraFeed camera={camera} onIncidentDetected={onIncidentDetected} />;
  }

  return (
    <Box
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <video
        ref={videoRef}
        key={streamUrl}
        src={streamUrl}
        autoPlay
        loop
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={handleError}
        onPlaying={() => {
          const countFrame = () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
            tick();
            requestAnimationFrame(countFrame);
          };
          requestAnimationFrame(countFrame);
        }}
      />
      <FpsOverlay fps={fps} />
      <DetectionOverlay
        videoRef={videoRef}
        cameraId={camera.id}
        streamType={camera.stream_type}
        cameraName={camera.name}
        onIncidentDetected={onIncidentDetected}
      />
    </Box>
  );
}
