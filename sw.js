// Pırtılcan Öğretmen - PWA Service Worker
const CACHE_NAME = 'pirtilcan-ogretmen-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './assets/data.js',
  './assets/pirtilcan_character.png',
  './assets/pirtilcan_round.png',
  './assets/pirtilcan_full.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/audio/school_bell.wav',
  './assets/audio/ding.wav',
  './assets/annual_plans.json',
  './assets/curriculum_meta.json',
  './assets/document_templates.json',
  './assets/maarif_cards.json',
  './assets/maarif_quotes.json',
  './assets/meb_calendar.json'
];

// Install Event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Pırtılcan SW] Statik varlıklar önbelleğe alınıyor...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Pırtılcan SW] Bazı dosyalar önbelleğe alınamadı, devam ediliyor:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Pırtılcan SW] Eski önbellek siliniyor:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache First, fallback to Network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Clone and store in cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for html navigation if offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
