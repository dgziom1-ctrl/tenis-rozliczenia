importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

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

// Powiadomienia gdy apka jest w TLE (zamknięta lub inna karta)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Cyber-Pong', {
    body:     body || '',
    icon:     '/icon-192v2.png',
    badge:    '/icon-192v2.png',
    vibrate:  [100, 50, 100],
    data:     payload.data || {},
    tag:      payload.data?.type || 'default',
    renotify: true,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
