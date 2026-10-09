/**
 * In-memory log of feeds that recently failed to connect. Survives SPA route
 * changes and the fullscreen wall swap, so a broken camera stays broken until
 * its source changes, it comes back live, or the TTL elapses. Without this a
 * card would sit in "connecting" again after every navigation and re-run the
 * whole handshake for a source we know is down.
 */

const FAILED = new Map<number, { url: string; at: number }>();

/** How long a failure sticks before a reconnect is attempted again. */
export const FEED_FAILURE_TTL_MS = 5 * 60 * 1000;

export function markFeedFailed(cameraId: number, url: string): void {
  FAILED.set(cameraId, { url, at: Date.now() });
}

/** True while this camera+source is in the failure window (sticky failed). */
export function isFeedRecentlyFailed(cameraId: number, url: string): boolean {
  const entry = FAILED.get(cameraId);
  if (!entry) return false;
  if (entry.url !== url) {
    FAILED.delete(cameraId);
    return false;
  }
  if (Date.now() - entry.at > FEED_FAILURE_TTL_MS) {
    FAILED.delete(cameraId);
    return false;
  }
  return true;
}

export function clearFeedFailure(cameraId: number): void {
  FAILED.delete(cameraId);
}