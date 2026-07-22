const CACHE_NAME = 'sky-academy-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Service Worker for API calls, hot-reload, and non-GET requests
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.startsWith('/_next/webpack-hmr') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 2. Network-First for HTML/Navigation requests (dynamic routes)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/').then((cached) => cached || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // 3. Cache-First only for static assets (JS, CSS, fonts, manifest, static icons/images)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/favicon.ico') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
