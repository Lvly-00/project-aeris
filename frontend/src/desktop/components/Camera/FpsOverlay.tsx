import { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

// ── useFps hook ───────────────────────────────────────────────────────────────

export function useFps() {
  const frameCount = useRef(0);
  const [fps, setFps] = useState(0);

  const tick = useCallback(() => {
    frameCount.current++;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(frameCount.current);
      frameCount.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { fps, tick };
}

// ── FpsOverlay component ──────────────────────────────────────────────────────

interface FpsOverlayProps {
  fps: number;
}

export function FpsOverlay({ fps }: FpsOverlayProps) {
  return (
    <Box
      pos="absolute"
      bottom={8}
      right={8}
      style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: fps > 0 ? '#4cff4c' : '#ff4c4c',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        lineHeight: '16px',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {fps > 0 ? `AI FPS: ${fps}` : 'Connecting...'}
    </Box>
  );
}
