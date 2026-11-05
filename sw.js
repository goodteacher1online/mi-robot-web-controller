const CACHE_NAME = 'mi-robot-v2.9';
const ASSETS = [
  './',
  './index.html',
  './robot-ble.js',
  './device-capability.js',
  './robot-alias.js',
  './piano-engine.js',
  './sensor-ml.js',
  './vision-ai.js',
  './manifest.json',
  './icon.png'
];

for (let i = 1; i <= 36; i++) {
  ASSETS.push(`./audio/piano${i}.wav`);
}

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

// Network-First for navigation & HTML, Cache-First for media/static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isHtml = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHtml) {
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
