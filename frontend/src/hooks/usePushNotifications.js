import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getDatabase, ref, set } from 'firebase/database';
import { database } from '../firebase/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Deterministyczny hash tokenu — używamy jako klucza w DB
function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (Math.imul(31, h) + token.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// Bezpieczny odczyt Notification.permission —
// iOS Safari w trybie przeglądarki (nie PWA) nie ma Notification API.
// Dostęp bez sprawdzenia rzuca TypeError i crashuje całą aplikację.
function safeNotificationPermission() {
  try {
    if (typeof Notification === 'undefined') return 'default';
    return Notification.permission;
  } catch {
    return 'default';
  }
}

export function usePushNotifications() {
  // useState z funkcją inicjalizującą — wykonuje się tylko raz podczas montowania.
  // Gdyby był to useState(Notification.permission) bez funkcji,
  // wyrażenie byłoby ewaluowane PRZED sprawdzeniem czy API istnieje.
  const [permission, setPermission] = useState(safeNotificationPermission);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setIsSupported(supported);
    // Odczytujemy permission ponownie po zamontowaniu —
    // ale tylko gdy API na pewno istnieje (sprawdzone powyżej)
    if (supported) {
      setPermission(safeNotificationPermission());
    }
  }, []);

  const registerToken = useCallback(async (playerName) => {
    if (!isSupported || !VAPID_KEY) return { success: false, error: 'Brak wsparcia lub klucza VAPID' };
    setIsRegistering(true);
    try {
      // Register service worker
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { success: false, error: 'Brak zgody na powiadomienia' };

      // Get FCM token
      const messaging = getMessaging();
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (!token) return { success: false, error: 'Nie udało się pobrać tokenu' };

      // Save token to Firebase
      const tokenKey = hashToken(token);
      await set(ref(database, `fcmTokens/${tokenKey}`), {
        token,
        playerName: playerName || 'unknown',
        updatedAt: Date.now(),
        ua: navigator.userAgent.slice(0, 100),
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
