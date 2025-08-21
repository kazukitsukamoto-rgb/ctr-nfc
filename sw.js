const CACHE_NAME = 'choice-to-run-v4';
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

// Install & cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // activate new SW ASAP
});

// Activate & clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never cache Google Apps Script calls (POST/GET)
  if (req.url.includes('script.google.com')) {
    return; // let it hit network
  }

  // For navigations (HTML pages), serve cached shell when offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Try network first for fresh HTML
        const fresh = await fetch(req);
        return fresh;
      } catch {
        // Offline → return cached index.html as a fallback
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // For all other GET requests: cache-first, then network
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