const CACHE_NAME = 'ctr-nfc-v2';
const APP_SHELL = [
  './',
  './index.html',
  './run.html',
  './results.html',
  './status.html',
  './styles.css',
  './app.js',
  './sw.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never cache Google Apps Script calls
  if (req.url.includes('script.google.com')) {
    return; // network pass-through (no intercept)
  }

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
  }
}); 