/* AERIS service worker — PWA installability + offline shell.
 *
 * Strategy:
 *   - SPA navigations: network-first, fall back to the cached copy of the
 *     same path (then "/") so previously visited routes work offline.
 *   - Static assets (js/css/icons/images): cache-first with background fill.
 *   - NEVER intercept backend traffic: /api/, /ws/, /ai/, /media/ and any
 *     cross-origin request always go straight to the network.
 *   - Every respondWith() is guaranteed to resolve to a Response so a
 *     missed cache never rejects the FetchEvent ("network error response").
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