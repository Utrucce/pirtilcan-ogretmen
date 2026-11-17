// Pırtılcan Öğretmen - Çevrimdışı Hizmet Çalışanı (Offline First)
const CACHE_NAME = 'pirtilcan-ogretmen-v2-scratch';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './assets/app_data.js',
  './assets/pirtilcan_logo.png',
  './assets/pirtilcan_selcuklu_turkuaz.png',
  './assets/pirtilcan_kabe_altin.png',
  './assets/pirtilcan_maarif_bordo.png',
  './assets/pirtilcan_zarif_gul.png',
  './assets/pirtilcan_zumrut_irfan.png',
  './assets/digital_bag_sites.json',
  './assets/official_documents.json',
  './assets/wisdom_quotes.json',
  './assets/wisdom_tips.json',
  './assets/curriculum/curriculum_index.json',
  './assets/audio/school_bell.wav',
  './assets/audio/chime.wav',
  './assets/audio/ding.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Pırtılcan SW] Statik varlıklar önbelleğe alınıyor...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Pırtılcan SW] Bazı dosyalar önbelleğe alınamadı:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
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
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
