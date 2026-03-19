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

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'Cyber-Pong', {
    body:     body || '',
    icon:     '/icon-192v2.png',
    badge:    '/icon-192v2.png',
    vibrate:  [100, 50, 100],
    // Przekazujemy URL do obsługi kliknięcia
    data:     { url: data.url || '/?tab=dashboard', ...data },
    tag:      data.type || 'default',
    renotify: true,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // URL zapisany w data.url przez Cloud Function
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? new URL(event.notification.data.url, self.location.origin).href
    : new URL('/?tab=dashboard', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Jeśli apka jest już otwarta — przełącz na nią i wyślij wiadomość z URL
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      // Apka zamknięta — otwórz z URL jako query param
      return clients.openWindow(targetUrl);
    })
  );
});
