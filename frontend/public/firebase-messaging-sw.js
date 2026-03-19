// v4 — wymusza aktualizację cache w przeglądarkach
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

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
  self.registration.showNotification(title || 'Cyber-Pong', {
    body,
    icon:     '/icon-192v2.png',
    badge:    '/icon-192v2.png',
    vibrate:  [100, 50, 100],
    data:     { url: data.url || '/?tab=dashboard', ...data },
    tag:      data.type || 'default',
    renotify: true,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url
    ? new URL(event.notification.data.url, self.location.origin).href
    : new URL('/?tab=dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
