import { useEffect, useRef, useState } from 'react';

/**
 * useNetworkStatus
 *
 * Tracks browser online/offline connectivity and drives the three-phase
 * recovery sequence shown by OfflineOverlay:
 *
 *   offline  →  (online event)
 *   justBack →  "You're back online!" message             (~1.6 s)
 *   reconnecting → spinner / "Reconnecting…"             (~1.4 s)
 *   done     →  overlay dismisses (Desktop) / page reloads (PWA)
 *
 * Phase durations are intentionally short so the total recovery animation
 * stays under 3 seconds.
 */

/** How long (ms) the "You're back online!" banner is shown. */
const BACK_ONLINE_MSG_DURATION = 1600;

/** How long (ms) the reconnecting spinner is shown after the message. */
const RECONNECTING_DURATION = 1400;

export type NetworkPhase =
  | 'offline'
  | 'justBack'
  | 'reconnecting'
  | 'online';

export function useNetworkStatus() {
  const [isOnline, setIsOnline]       = useState(() => navigator.onLine);
  const [phase, setPhase]             = useState<NetworkPhase>(
    () => (navigator.onLine ? 'online' : 'offline')
  );

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (t1.current) { clearTimeout(t1.current); t1.current = null; }
    if (t2.current) { clearTimeout(t2.current); t2.current = null; }
  };

  useEffect(() => {
    const handleOffline = () => {
      clearTimers();
      setIsOnline(false);
      setPhase('offline');
    };

    const handleOnline = () => {
      clearTimers();
      setIsOnline(true);
      setPhase('justBack');

      // After the banner, switch to spinner phase.
      t1.current = setTimeout(() => {
        setPhase('reconnecting');

        // After the spinner, mark fully online so the overlay can close.
        t2.current = setTimeout(() => {
          setPhase('online');
        }, RECONNECTING_DURATION);
      }, BACK_ONLINE_MSG_DURATION);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
      clearTimers();
    };
  }, []);

  return {
    isOnline,
    phase,
    /** Convenience booleans the overlay can branch on */
    isOffline:       phase === 'offline',
    isJustBack:      phase === 'justBack',
    isReconnecting:  phase === 'reconnecting',
  };
}
