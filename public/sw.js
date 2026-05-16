self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Network-first: always fetch fresh, fall back gracefully
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() =>
      new Response('You appear to be offline.', { status: 503 })
    )
  );
});
