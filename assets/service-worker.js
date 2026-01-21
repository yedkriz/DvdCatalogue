const CACHE_NAME = 'catalog-cache-v1';
const ASSETS = [
  '/DvdCatalogue/',
  '/DvdCatalogue/index.html',
  '/DvdCatalogue/assets/styles.css',
  '/DvdCatalogue/assets/app.js',
  '/DvdCatalogue/assets/idb.js',
  '/DvdCatalogue/assets/manifest.json',
  '/DvdCatalogue/assets/icons/icon-192.png',
  '/DvdCatalogue/assets/icons/icon-512.png',
  '/DvdCatalogue/assets/icons/placeholder.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) =>
          fetch(url).then((resp) => {
            if (resp.ok) {
              return cache.put(url, resp);
            } else {
              console.warn('Skipping asset:', url);
            }
          }).catch((err) => {
            console.warn('Failed to cache:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );

});
