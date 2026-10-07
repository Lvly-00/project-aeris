/**
 * CameraFeed — dispatches to the right feed component based on stream_type.
 * HTTP/MP4 cameras use a <video> element; RTSP uses the canvas polling path.
 *
 * Reports measured FeedStats back through onStats so the surrounding card can
 * show real fps, real resolution and the true connection state instead of a
 * badge that always says LIVE.
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Text } from '@mantine/core';
import { Video } from '@boxicons/react';
import { useFps, IDLE_FEED_STATS } from './useFps';
import type { FeedStats, FeedState } from './useFps';
import { DetectionOverlay } from './DetectionOverlay';
import { RTSPCameraFeed } from './RTSPCameraFeed';
import { useCameraFeed } from '../../../shared/hooks/useCameraFeed';
import type { IncidentDetectedData } from './DetectionOverlay';

interface CameraFeedProps {
  camera: any;
  onIncidentDetected?: (data: IncidentDetectedData) => void;
  onStats?: (cameraId: number, stats: FeedStats) => void;
}

export function CameraFeed({ camera, onIncidentDetected, onStats }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { fps, tick } = useFps();

  // Exactly one frame-counting loop at a time: every 'playing' event used to
  // spawn another loop, so a stall/recover cycle doubled the measured fps.
  const rafRef = useRef<number | null>(null);
  const stopCounting = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);
  const startCounting = useCallback(() => {
    stopCounting();
    const step = () => {
      const el = videoRef.current;
      if (!el || el.paused || el.ended || el.readyState < 2) {
        rafRef.current = null;
        return;
      }
      tick();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [tick, stopCounting]);

  useEffect(() => stopCounting, [stopCounting]);

  // 'live' only once the decoder is actually producing frames.
  const [playState, setPlayState] = useState<'connecting' | 'live'>('connecting');
  const [stats, setStats] = useState<FeedStats>(IDLE_FEED_STATS);

  // Shared hook resolves the token from localStorage *and* sessionStorage, so
  // MP4 keeps working when the user logged in without "Remember Me".
  const { streamUrl, hasError, errorMsg, handleError } = useCameraFeed({
    cameraId: camera.id,
    streamType: camera.stream_type,
  });

  const report = useCallback(
    (patch: Partial<FeedStats>) =>
      setStats((prev) => {
        const next = { ...prev, ...patch };
        return next.state === prev.state &&
          next.fps === prev.fps &&
          next.width === prev.width &&
          next.height === prev.height
          ? prev
          : next;
      }),
    [],
  );

  // Read the decoder's real pixel size whenever the source settles.
  useEffect(() => {
    const readSize = () => {
      const el = videoRef.current;
      if (el && el.videoWidth > 0) {
        report({ width: el.videoWidth, height: el.videoHeight });
      }
    };

    readSize();
    const el = videoRef.current;
    el?.addEventListener('loadedmetadata', readSize);
    el?.addEventListener('playing', readSize);
    return () => {
      el?.removeEventListener('loadedmetadata', readSize);
      el?.removeEventListener('playing', readSize);
    };
  }, [streamUrl, report]);

  const state: FeedState = hasError ? 'offline' : playState;

  useEffect(() => report({ fps }), [fps, report]);
  useEffect(() => report({ state }), [state, report]);

  // RTSP reports for itself; reporting here as well would overwrite its real
  // numbers with these placeholders on mount.
  const delegates = camera.stream_type === 'RTSP';
  useEffect(() => {
    if (!delegates) onStats?.(camera.id, stats);
  }, [stats, onStats, delegates, camera.id]);

  // Switching cameras or rebuilding the URL restarts the handshake.
  useEffect(() => {
    if (streamUrl) setPlayState('connecting');
  }, [streamUrl]);

  if (camera.stream_type === 'EMBED') {
    return (
      <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          src={camera.stream_url}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin allow-popups"
          allowFullScreen
          title={camera.name}
          onLoad={() => setPlayState('live')}
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
    return (
      <RTSPCameraFeed
        camera={camera}
        onIncidentDetected={onIncidentDetected}
        onStats={onStats}
      />
    );
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
          setPlayState('live');
          startCounting();
        }}
        onWaiting={() => { setPlayState('connecting'); stopCounting(); }}
        onStalled={() => { setPlayState('connecting'); stopCounting(); }}
        onAbort={() => { setPlayState('connecting'); stopCounting(); }}
        onPause={() => { setPlayState('connecting'); stopCounting(); }}
      />
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
