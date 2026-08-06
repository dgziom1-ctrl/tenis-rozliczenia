// v5 — wymusza aktualizację cache w przeglądarkach
// Wersja SDK trzymana zgodnie z `firebase` w frontend/package.json — rozjazd
// major między stroną a workerem potrafi po cichu zepsuć odbiór powiadomień.
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

/** Ekran otwierany, gdy powiadomienie nie wskazuje własnego adresu. */
const DEFAULT_TARGET = '/?tab=dashboard';

// Aktywuj nową wersję SW natychmiast, bez czekania aż użytkownik zamknie wszystkie karty.
// Bez tego przeglądarka trzyma starą wersję (z PLACEHOLDER) dopóki użytkownik
// sam nie odświeży strony we wszystkich otwartych kartach.
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

firebase.initializeApp({
  apiKey:            "PLACEHOLDER_API_KEY",
  authDomain:        "PLACEHOLDER_AUTH_DOMAIN",
  databaseURL:       "PLACEHOLDER_DATABASE_URL",
  projectId:         "PLACEHOLDER_PROJECT_ID",
  storageBucket:     "PLACEHOLDER_STORAGE_BUCKET",
  messagingSenderId: "PLACEHOLDER_MESSAGING_SENDER_ID",
  appId:             "PLACEHOLDER_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};
  self.registration.showNotification(title || 'Cyber-Ponk', {
    body,
    icon:     '/icon-192v2.png',
    badge:    '/icon-192v2.png',
    vibrate:  [100, 50, 100],
    // `url` na końcu: rozpakowanie `data` po nim nadpisywało wartość domyślną
    // pustym stringiem z payloadu.
    data:     { ...data, url: data.url || DEFAULT_TARGET },
    // Użyj tagu z data (ustawionego przez Cloud Function) dla unikalności.
    // Cloud Function wysyła tag: 'session-YYYY-MM-DD' lub 'streak-ImięGracza'
    // co gwarantuje że każde powiadomienie wyświetla się osobno.
    tag:      data.tag || data.type || 'default',
    renotify: true,
  });
});

/**
 * Zamienia `data.url` z powiadomienia na bezpieczny adres w obrębie tej apki.
 *
 * Adres bezwzględny (np. `https://obcy.example`) zignorowałby bazę i otworzył
 * cudzą stronę z naszego powiadomienia, więc wszystko spoza naszego origin
 * zastępujemy ekranem startowym.
 */
function resolveSameOriginUrl(rawUrl) {
  const fallback = new URL(DEFAULT_TARGET, self.location.origin).href;
  if (typeof rawUrl !== 'string' || rawUrl === '') return fallback;
  try {
    const url = new URL(rawUrl, self.location.origin);
    return url.origin === self.location.origin ? url.href : fallback;
  } catch {
    return fallback;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = resolveSameOriginUrl(data.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // `includes` dopasowywało też adresy, w których nasz origin był tylko
        // fragmentem ścieżki obcej strony.
        if (client.url.startsWith(`${self.location.origin}/`) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
