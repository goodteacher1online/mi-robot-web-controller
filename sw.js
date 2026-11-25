const CACHE_NAME = 'mi-robot-v4.0';
const ASSETS = [
  './',
  './index.html',
  './robot-ble.js',
  './robot-alias.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Network-First for HTML & JS/JSON, Cache-First for static media
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isCodeOrDoc = e.request.mode === 'navigate' ||
                      url.pathname.endsWith('.html') ||
                      url.pathname.endsWith('/') ||
                      url.pathname.endsWith('.js') ||
                      url.pathname.endsWith('.json');

  if (isCodeOrDoc) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((res) => res || fetch(e.request))
    );
  }
});
