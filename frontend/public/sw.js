/* AERIS service worker — PWA installability + offline shell + Web Push.
 *
 * Strategy:
 *   - SPA navigations: network-first, fall back to the cached copy of the
 *     same path (then "/") so previously visited routes work offline.
 *   - Static assets (js/css/icons/images): cache-first with background fill.
 *   - NEVER intercept backend traffic: /api/, /ws/, /ai/, /media/ and any
 *     cross-origin request always go straight to the network.
 *   - Every respondWith() is guaranteed to resolve to a Response so a
 *     missed cache never rejects the FetchEvent ("network error response").
 *   - Push notifications: show a system notification even when every tab
 *     is closed. Tapping opens the relevant incident detail page.
 */

const CACHE_NAME = 'aeris-static-v2';

const APP_SHELL = [
  '/',
  '/pwa',
  '/manifest.webmanifest',
  '/index.html',
  '/icons/icon-120.png',
  '/icons/icon-152.png',
  '/icons/icon-167.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/splash/splash-1170x2532.png',
  '/splash/splash-1179x2556.png',
  '/splash/splash-1284x2778.png',
  '/splash/splash-1290x2796.png',
  '/splash/splash-828x1792.png',
  '/splash/splash-750x1334.png',
  '/splash/splash-640x1136.png',
  '/splash/splash-2048x2732.png',
  '/splash/splash-1668x2388.png',
  '/splash/splash-1668x2224.png',
  '/splash/splash-1536x2048.png',
];

const BYPASS_PREFIXES = ['/api/', '/ws/', '/ai/', '/media/', '/admin/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache each shell asset independently so one failing URL (e.g. a
      // redirect) doesn't abort the whole install and leave us without a SW.
      await Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => {}))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function offlineResponse() {
  const cache = await caches.open(CACHE_NAME);
  return (
    (await cache.match('/index.html')) ||
    (await cache.match('/')) ||
    new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  );
}

// ── Web Push ──────────────────────────────────────────────────────────────────
// Receives background push payloads from the backend (pywebpush / VAPID).
// Fires even when every tab is closed.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* non-JSON payload — treat as empty */
  }

  const title = data.title || 'AERIS Alert';
  const options = {
    body: data.message || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    // Use a stable tag per notification so duplicate pushes collapse on
    // the device instead of stacking, then re-notify so the alert fires.
    tag: data.notification_id ? `notif-${data.notification_id}` : 'aeris-notif',
    renotify: true,
    data: {
      incident_id: data.incident_id ?? null,
      notification_id: data.notification_id ?? null,
      // Deep-link URL is computed by the backend based on the recipient's role.
      // Falls back to /pwa if the payload doesn't include one.
      url: data.url || (data.incident_id ? `/pwa/admin/incidents/${data.incident_id}` : '/pwa'),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification opens (or focuses) the incident detail page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/pwa';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Reuse an existing tab if one already has the app open.
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No existing tab — open a new one.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  // SPA navigations: network-first so users always get the latest build.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const copy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, copy);
          return response;
        } catch {
          const cached =
            (await caches.match(request)) || (await caches.match('/'));
          return cached || offlineResponse();
        }
      })()
    );
    return;
  }

  // Static assets: cache-first with network fill.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, copy);
        }
        return response;
      } catch {
        return offlineResponse();
      }
    })()
  );
});
