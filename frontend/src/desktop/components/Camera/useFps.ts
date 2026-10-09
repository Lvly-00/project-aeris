/**
 * useFps — measures the rate at which a feed actually produces frames.
 *
 * The value is counted from real frame callbacks, so it is 0 until the first
 * frame lands and drifts to 0 again if the feed stalls. It is reported through
 * FeedStats rather than painted over the video: operators want it in the card
 * footer alongside the other facts about the camera.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

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

export type FeedState = 'connecting' | 'live' | 'offline';

/** How long a feed may stay connecting before it is reported as failed. */
export const CONNECT_TIMEOUT_MS = 30_000;

/**
 * What the feed knows about itself, measured rather than configured.
 * width/height stay 0 until the decoder reports real pixel dimensions.
 */
export interface FeedStats {
  state: FeedState;
  /** Measured frames per second over the last second. */
  fps: number;
  /** Intrinsic pixel dimensions; 0 while unknown. */
  width: number;
  height: number;
}

export const IDLE_FEED_STATS: FeedStats = {
  state: 'connecting',
  fps: 0,
  width: 0,
  height: 0,
};
