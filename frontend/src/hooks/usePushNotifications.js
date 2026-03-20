import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
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

      // Zapisz hash tokenu w localStorage — pozwala sprawdzić czy TO urządzenie
      // ma token w bazie bez konieczności wywołania getToken() (które triggeruje popup).
      try { localStorage.setItem('push-token-key', tokenKey); } catch {}

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
