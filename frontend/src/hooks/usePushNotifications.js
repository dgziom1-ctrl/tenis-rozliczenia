import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { database } from '../firebase/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (Math.imul(31, h) + token.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function safeNotificationPermission() {
  try {
    if (typeof Notification === 'undefined') return 'default';
    return Notification.permission;
  } catch {
    return 'default';
  }
}

export function usePushNotifications() {
  const [permission,    setPermission]    = useState(safeNotificationPermission);
  const [isSupported,   setIsSupported]   = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setIsSupported(supported);
    if (supported) setPermission(safeNotificationPermission());
  }, []);

  // ── Powiadomienia gdy apka jest OTWARTA (foreground) ──────────────────────
  // Gdy apka jest aktywna, FCM nie pokazuje powiadomień automatycznie —
  // trzeba obsłużyć je samodzielnie przez onMessage().
  //
  // WAŻNE: używamy registration.showNotification() zamiast new Notification(),
  // żeby klik w powiadomienie zawsze przechodził przez SW notificationclick.
  // Dzięki temu SW wysyła postMessage do apki z poprawnym URL (tab + player),
  // co otwiera właściwą zakładkę i modal gracza — zarówno dla new_session
  // (→ Dashboard) jak i streak (→ RANKING + modal gracza).
  // new Notification() nie ma dostępu do SW notificationclick i klik
  // nie robiłby nic użytecznego.
  useEffect(() => {
    if (safeNotificationPermission() !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;

    let unsubscribe = null;
    try {
      const messaging = getMessaging();
      unsubscribe = onMessage(messaging, async (payload) => {
        const { title, body } = payload.notification || {};
        if (!title) return;

        try {
          // Preferuj SW showNotification — klik obsługuje notificationclick w SW
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body:     body || '',
            icon:     '/icon-192v2.png',
            badge:    '/icon-192v2.png',
            vibrate:  [100, 50, 100],
            tag:      payload.data?.tag || payload.data?.type || 'default',
            renotify: true,
            // data trafia do event.notification.data w SW notificationclick
            data: {
              url: payload.data?.url || '/?tab=dashboard',
              ...payload.data,
            },
          });
        } catch {
          // Fallback — niektóre starsze przeglądarki nie wspierają SW showNotification
          try {
            new Notification(title, {
              body:  body || '',
              icon:  '/icon-192v2.png',
              badge: '/icon-192v2.png',
            });
          } catch {
            // ignoruj — brak wsparcia
          }
        }
      });
    } catch {
      // getMessaging() może rzucić jeśli Firebase nie jest skonfigurowany
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const registerToken = useCallback(async (playerName) => {
    if (!isSupported || !VAPID_KEY) {
      return { success: false, error: 'Brak wsparcia lub klucza VAPID' };
    }
    setIsRegistering(true);
    try {
      // Rejestruj SW — Vite plugin zapewnia że ma poprawny Firebase config
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        return { success: false, error: 'Brak zgody na powiadomienia' };
      }

      const messaging = getMessaging();
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (!token) return { success: false, error: 'Nie udało się pobrać tokenu FCM' };

      const tokenKey = hashToken(token);
      await set(ref(database, `fcmTokens/${tokenKey}`), {
        token,
        playerName: playerName || 'unknown',
        updatedAt:  Date.now(),
        ua:         navigator.userAgent.slice(0, 100),
      });

      return { success: true };
    } catch (err) {
      console.error('Push registration error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported]);

  return { permission, isSupported, isRegistering, registerToken };
}
