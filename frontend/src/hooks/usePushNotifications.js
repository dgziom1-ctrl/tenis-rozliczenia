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

// Tłumaczy błędy FCM / PushManager na przyjazne komunikaty po polsku
function friendlyPushError(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || '';

  // "push service error" — przeglądarka nie może połączyć się z Google Push Service
  // Najczęstsze przyczyny na PC: brak połączenia z googleapis.com, firewall,
  // tryb prywatny bez uprawnień, Chrome bez konta Google w niektórych konfiguracjach
  if (msg.includes('push service') || msg.includes('pushservice')) {
    return 'Usługa push niedostępna w tej przeglądarce. Spróbuj w Chrome (nie incognito) lub na telefonie.';
  }
  if (msg.includes('registration failed') || msg.includes('service worker')) {
    return 'Błąd rejestracji Service Worker. Odśwież stronę i spróbuj ponownie.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.';
  }
  if (msg.includes('permission') || msg.includes('denied')) {
    return 'Brak uprawnień do powiadomień. Sprawdź ustawienia przeglądarki.';
  }
  if (msg.includes('vapid') || msg.includes('applicationserverkey')) {
    return 'Błąd konfiguracji VAPID. Skontaktuj się z administratorem.';
  }
  if (code === 'messaging/token-unsubscribe-failed') {
    return 'Nie udało się wyrejestrować starego tokenu. Odśwież stronę.';
  }
  // Fallback — pokaż oryginalny komunikat po angielsku
  return err?.message || 'Nieznany błąd';
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
      // Wyrejestruj stare SW i zarejestruj świeże — rozwiązuje problem "push service error"
      // który może pojawić się gdy stary SW jest w błędnym stanie po poprzedniej próbie
      const existingRegs = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegs) {
        if (reg.active?.scriptURL?.includes('firebase-messaging-sw')) {
          await reg.unregister();
        }
      }

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      // Czekaj aż SW będzie gotowy (active) — bez tego getToken() może się nie udać
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
      return { success: false, error: friendlyPushError(err) };
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported]);

  return { permission, isSupported, isRegistering, registerToken };
}
