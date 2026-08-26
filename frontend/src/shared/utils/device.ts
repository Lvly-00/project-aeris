/**
 * Generates a stable device fingerprint for trusted-device recognition.
 * The fingerprint is a SHA-256 hash of browser characteristics that
 * stay consistent across sessions on the same device.
 *
 * It is NOT a unique tracking ID — it simply lets the backend know
 * "this browser + screen combo has already passed 2FA".
 */

const DEVICE_ID_KEY = 'aeris_device_id';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns a stable device fingerprint. Generated once per browser and
 * persisted in localStorage so it survives page reloads and sessions.
 */
export async function getDeviceId(): Promise<string> {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    new Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
  ];

  const fingerprint = await sha256(components.join('|'));
  localStorage.setItem(DEVICE_ID_KEY, fingerprint);
  return fingerprint;
}
