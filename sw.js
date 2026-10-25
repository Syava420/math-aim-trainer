const CACHE_NAME = 'math-aim-trainer-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/src/css/base.css',
  '/src/css/arena.css',
  '/src/css/hud.css',
  '/src/css/modal.css',
  '/src/css/study.css',
  '/src/js/app.js',
  '/src/js/core/math-engine.js',
  '/src/js/core/particle-fx.js',
  '/src/js/core/sound-engine.js',
  '/src/js/core/stats-store.js',
  '/src/js/game/game-controller.js',
  '/src/js/game/target-manager.js',
  '/src/js/ui/crosshair.js',
  '/src/js/ui/hud-view.js',
  '/src/js/ui/results-view.js',
  '/src/js/ui/settings-view.js',
  '/src/js/ui/study-view.js',
  '/src/js/ui/training-modal.js',
  '/src/js/ui/vault-view.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately
        return cachedResponse;
      }

      // If not in cache, fetch from network and dynamically cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and request is for page navigation, fallback to root index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
