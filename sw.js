const CACHE_NAME = 'mi-robot-v2.2';
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

// Add piano audio assets to offline cache
for (let i = 1; i <= 36; i++) {
  ASSETS.push(`./audio/piano${i}.wav`);
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
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

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
