/**
 * In-memory access token storage (NFR-LG-002).
 *
 * - The refresh token is now an HttpOnly cookie owned by the backend, so it
 *   is never visible to (or writable by) JavaScript.
 * - The access token lives only in this module-level variable. It disappears
 *   on a full page reload, where a silent cookie refresh restores the session.
 *   Nothing token-related is ever written to localStorage/sessionStorage.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

/** Drops the in-memory token and any non-auth view preference on sign-out. */
export function clearTokens(): void {
  accessToken = null;
  localStorage.removeItem('viewMode');
}
