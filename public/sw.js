// Zmień tę wersję (np. na 'tenis-v2'), gdy wrzucasz nowe funkcje!
=======
const CACHE_NAME = 'tenis-v7';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalacja - cache'owanie podstawowych plików
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Aktywacja - usuwanie wszystkich starych wersji cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Strategia Fetch
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. ZASOBY ZEWNĘTRZNE (Firebase, Google, Chart.js) - Zawsze z sieci
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('gstatic') || 
    url.hostname.includes('googleapis') ||
    url.hostname.includes('cloudflare')
  ) {
    return; 
  }

  // 2. STRATEGIA DLA index.html (Network First)
  // Chcemy, żeby nowa funkcjonalność była widoczna od razu, jeśli jest internet
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Pobrano nową wersję - zapisz ją w cache
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
          return response;
        })
        .catch(() => {
          // Brak internetu - daj wersję z cache
          return caches.match(e.request);
        })
    );
    return;
  }

  // 3. POZOSTAŁE PLIKI (Stale-while-revalidate)
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      const fetchPromise = fetch(e.request).then(networkResponse => {
        if (networkResponse.ok && e.request.method === 'GET') {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
