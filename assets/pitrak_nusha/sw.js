/* Pıtrak Nüsha — Çevrimdışı Çalışma & Anında Güncelleme */
const CACHE = 'pitrak-nusha-v19';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'style.css',
  'db.js',
  'render.js',
  'export.js',
  'app.js',
  'assets/style.css',
  'assets/db.js',
  'assets/render.js',
  'assets/export.js',
  'assets/app.js',
  'assets/pitrak.jpg',
  'assets/alef.png',
  'assets/kurt-gumus.png',
  'assets/icon-192.png',
  'assets/backgrounds/bg-parchment.svg',
  'assets/backgrounds/bg-blackboard.svg',
  'assets/backgrounds/bg-marble.svg',
  'assets/backgrounds/bg-ebru.svg',
  'assets/backgrounds/bg-midnight.svg',
  'assets/backgrounds/bg-kraft.svg',
  'assets/backgrounds/bg-espresso.svg',
  'assets/backgrounds/bg-sage.svg',
  'assets/backgrounds/bg-rose.svg',
  'assets/backgrounds/bg-linen.svg',
  'assets/backgrounds/bg-selcuk-parchment.jpg',
  'assets/backgrounds/bg-uzay-kozmik.jpg',
  'assets/backgrounds/bg-tabiat-orman.jpg',
  'assets/backgrounds/bg-mitoloji-antik.jpg',
  'assets/backgrounds/bg-film-sinematik.jpg',
  'assets/backgrounds/bg-kuzey-isiklari.jpg',
  'assets/backgrounds/bg-antik-kutuphane.jpg',
  'assets/backgrounds/bg-col-kum.jpg',
  'assets/backgrounds/bg-okyanus-derin.jpg',
  'assets/backgrounds/bg-mermer-altin.jpg',
  'assets/backgrounds/bg-anime-ghibli.jpg',
  'assets/backgrounds/bg-pixar-sehir.jpg',
  'assets/backgrounds/bg-siber-neon.jpg',
  'assets/backgrounds/bg-retro-synthwave.jpg',
  'assets/backgrounds/bg-mercan-dunya.jpg',
  'assets/backgrounds/bg-buyulu-orman.jpg',
  'assets/backgrounds/bg-gotik-sato.jpg',
  'assets/backgrounds/bg-suluboya-dag.jpg',
  'assets/backgrounds/bg-vintage-cizgi.jpg',
  'assets/backgrounds/bg-japon-dalga.jpg'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-First Stratejisi */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
      }
      return r;
    }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html')))
  );
});
