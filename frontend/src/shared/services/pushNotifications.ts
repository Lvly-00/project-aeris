/**
 * Web Push subscription manager.
 *
 * Responsibilities:
 *  1. Fetch the VAPID public key from the backend.
 *  2. Subscribe the browser/PWA to the Push API.
 *  3. Send the resulting subscription to the backend for storage.
 *  4. Unsubscribe and tell the backend to delete the subscription on opt-out.
 *
 * This module is intentionally side-effect-free on import — call
 * `subscribeToPush()` after the user grants notification permission.
 */

import api from './api';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a base64url string (no padding) to a Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/** Fetch the VAPID public key from the backend. Cached after first fetch. */
let _vapidPublicKey: string | null = null;
async function getVapidPublicKey(): Promise<string> {
  if (_vapidPublicKey) return _vapidPublicKey;
  const res = await api.get<{ vapid_public_key: string }>('/notifications/vapid-public-key/');
  _vapidPublicKey = res.data.vapid_public_key;
  return _vapidPublicKey;
}

/** True when the runtime supports Web Push. */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// ── Core API ──────────────────────────────────────────────────────────────────

/**
 * Request permission, subscribe via the Push API, and register the
 * subscription with the backend.
 *
 * Returns `'subscribed'` on success, `'denied'` when the user blocked
 * notifications, or `'unsupported'` when the browser doesn't support it.
 */
export async function subscribeToPush(): Promise<'subscribed' | 'denied' | 'unsupported'> {
  if (!isPushSupported()) {
    console.warn('[PUSH] Not supported in this browser/environment');
    return 'unsupported';
  }

  // Ask for permission (only shown when not already granted/denied).
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[PUSH] Permission not granted:', permission);
    return 'denied';
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('[PUSH] Service worker ready, subscribing...');

    const vapidKey = await getVapidPublicKey();
    console.log('[PUSH] Got VAPID key, length:', vapidKey.length);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    console.log('[PUSH] Subscribed to push manager, sending to backend...');
    await savePushSubscription(subscription);
    console.log('[PUSH] Subscription saved to backend ✓');
    return 'subscribed';
  } catch (err) {
    console.error('[PUSH] Subscribe error:', err);
    throw err;
  }
}

/**
 * Unsubscribe from the Push API and tell the backend to delete the
 * subscription record. Safe to call even if no subscription exists.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await deletePushSubscription(endpoint);
  } catch (err) {
    console.error('[PUSH] Unsubscribe error:', err);
  }
}

/**
 * Returns the current push permission state: 'granted', 'denied', or 'prompt'.
 * Returns 'unsupported' if the browser doesn't support notifications.
 */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ── Backend sync ──────────────────────────────────────────────────────────────

function extractKeys(sub: PushSubscription): { p256dh: string; auth: string } {
  const rawKeys = sub.getKey ? { p256dh: sub.getKey('p256dh'), auth: sub.getKey('auth') } : null;

  const encode = (buf: ArrayBuffer | null) => {
    if (!buf) return '';
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  return {
    p256dh: encode(rawKeys?.p256dh ?? null),
    auth: encode(rawKeys?.auth ?? null),
  };
}

async function savePushSubscription(sub: PushSubscription): Promise<void> {
  const { p256dh, auth } = extractKeys(sub);
  await api.post('/notifications/push-subscription/', {
    endpoint: sub.endpoint,
    p256dh,
    auth,
  });
}

async function deletePushSubscription(endpoint: string): Promise<void> {
  await api.delete('/notifications/push-subscription/', { data: { endpoint } });
}
