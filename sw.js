const CACHE_NAME = 'math-aim-trainer-v2';
const BASE_PATH = self.location.pathname.replace(/\/sw\.js$/, '') || '';

const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.webmanifest`,
  `${BASE_PATH}/favicon.ico`,
  `${BASE_PATH}/src/css/base.css`,
  `${BASE_PATH}/src/css/arena.css`,
  `${BASE_PATH}/src/css/hud.css`,
  `${BASE_PATH}/src/css/modal.css`,
  `${BASE_PATH}/src/css/study.css`,
  `${BASE_PATH}/src/js/app.js`,
  `${BASE_PATH}/src/js/core/math-engine.js`,
  `${BASE_PATH}/src/js/core/particle-fx.js`,
  `${BASE_PATH}/src/js/core/sound-engine.js`,
  `${BASE_PATH}/src/js/core/stats-store.js`,
  `${BASE_PATH}/src/js/game/game-controller.js`,
  `${BASE_PATH}/src/js/game/target-manager.js`,
  `${BASE_PATH}/src/js/ui/crosshair.js`,
  `${BASE_PATH}/src/js/ui/hud-view.js`,
  `${BASE_PATH}/src/js/ui/results-view.js`,
  `${BASE_PATH}/src/js/ui/settings-view.js`,
  `${BASE_PATH}/src/js/ui/study-view.js`,
  `${BASE_PATH}/src/js/ui/training-modal.js`,
  `${BASE_PATH}/src/js/ui/vault-view.js`
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Cache-First for page navigation (works instantly even when offline or when domain is blocked by ISP)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(`${BASE_PATH}/index.html`, { ignoreSearch: true })
        .then((cachedIndex) => {
          if (cachedIndex) return cachedIndex;
          return caches.match(`${BASE_PATH}/`, { ignoreSearch: true });
        })
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request);
        })
        .catch(() => caches.match(`${BASE_PATH}/index.html`))
    );
    return;
  }

  // Pure Cache-First for static assets (scripts, styles, icons)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const toCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, toCache);
        });

        return networkResponse;
      });
    })
  );
});
