const CACHE_NAME = 'tenis-v1';

// Pliki do cache przy instalacji
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instalacja — zakeszuj pliki statyczne
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // aktywuj od razu, bez czekania
  );
});

// Aktywacja — usuń stare cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — strategia: Firebase zawsze z sieci, reszta cache-first
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase, gstatic, googleapis — zawsze z sieci (real-time data)
  if (
    url.includes('firebase') ||
    url.includes('firebaseio') ||
    url.includes('gstatic') ||
    url.includes('googleapis') ||
    url.includes('cloudflare')
  ) {
    return; // przeglądarka obsłuży normalnie
  }

  // Reszta — cache first, fallback do sieci
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Zakeszuj nowe zasoby dynamicznie
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback — zwróć index.html
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
