const CACHE_NAME = 'beyondx-shell-v1';

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/favicon-180.png',
  '/favicon.png',
  '/favicon.svg',
];

// Anything matching these must never be served from cache — it's live data,
// not app shell. Same-origin Vercel functions + the cross-origin Railway API.
const NEVER_CACHE = [/^\/api\//, /beyondx-backend/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNeverCache = NEVER_CACHE.some((pattern) => pattern.test(url.pathname) || pattern.test(url.href));

  // Cross-origin (e.g. the Railway API) or explicitly excluded paths: go
  // straight to the network, never touch the cache in either direction.
  if (!isSameOrigin || isNeverCache) {
    event.respondWith(fetch(request));
    return;
  }

  // App shell: network-first so a fresh deploy is picked up immediately,
  // falling back to the cached shell only when the network is unavailable.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
