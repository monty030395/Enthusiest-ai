const CACHE_VERSION = 'mp8qwwp7';
const CACHE_NAME = `enthusiast-ai-${CACHE_VERSION}`;

// Install: activate immediately without waiting for old SW to be unloaded
self.addEventListener('install', () => self.skipWaiting());

// Activate: delete every cache that isn't the current version, then claim all clients
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

// Fetch: network-first. Cache successful responses for offline fallback.
// API calls and non-GET requests are never cached.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || request.url.includes('/api/')) return;

  e.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached =>
          cached ?? new Response('You appear to be offline.', { status: 503 })
        )
      )
  );
});
