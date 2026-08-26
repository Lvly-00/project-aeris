/**
 * Remember-Me-aware token storage (FR-LG-002 / NFR-LG-002).
 *
 * - Remember Me checked  → tokens persist in localStorage (trusted device).
 * - Remember Me unchecked→ tokens live in sessionStorage only, so closing
 *   the browser/tab ends the session.
 */

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

function stores(): Storage[] {
  return typeof window !== 'undefined' ? [localStorage, sessionStorage] : [];
}

export function getAccessToken(): string | null {
  for (const store of stores()) {
    const token = store.getItem(ACCESS_KEY);
    if (token) return token;
  }
  return null;
}

export function getRefreshToken(): string | null {
  for (const store of stores()) {
    const token = store.getItem(REFRESH_KEY);
    if (token) return token;
  }
  return null;
}

/** Writes tokens into the requested storage, clearing the other one first. */
export function setTokens(access: string, refresh: string, remember: boolean): void {
  clearTokens();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(ACCESS_KEY, access);
  store.setItem(REFRESH_KEY, refresh);
}

/**
 * Persists a rotated access token into whichever storage currently holds
 * the session (keeps Remember-Me semantics across token rotation).
 */
export function persistAccessToken(access: string): void {
  for (const store of stores()) {
    if (store.getItem(REFRESH_KEY)) {
      store.setItem(ACCESS_KEY, access);
      return;
    }
  }
}

/** Removes every trace of the session from both storages. */
export function clearTokens(): void {
  for (const store of stores()) {
    store.removeItem(ACCESS_KEY);
    store.removeItem(REFRESH_KEY);
  }
  localStorage.removeItem('viewMode');
}
