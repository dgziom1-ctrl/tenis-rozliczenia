import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase/config';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function hashToken(token: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x811c9dc5);
  }
  return (Math.abs(h1) >>> 0).toString(36) + (Math.abs(h2) >>> 0).toString(36);
}

function safeNotificationPermission(): NotificationPermission {
  try {
    if (typeof Notification === 'undefined') return 'default';
    return Notification.permission;
  } catch {
    return 'default';
  }
}

function friendlyPushError(err: unknown): string {
  const msg = ((err as any)?.message || '').toLowerCase();
  const code = (err as any)?.code || '';

  if (msg.includes('push service') || msg.includes('pushservice'))
    return 'Usługa push niedostępna w tej przeglądarce. Spróbuj w Chrome (nie incognito) lub na telefonie.';
  if (msg.includes('registration failed') || msg.includes('service worker'))
    return 'Błąd rejestracji Service Worker. Odśwież stronę i spróbuj ponownie.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.';
  if (msg.includes('permission') || msg.includes('denied'))
    return 'Brak uprawnień do powiadomień. Sprawdź ustawienia przeglądarki.';
  if (msg.includes('vapid') || msg.includes('applicationserverkey'))
    return 'Błąd konfiguracji VAPID. Skontaktuj się z administratorem.';
  if (code === 'messaging/token-unsubscribe-failed')
    return 'Nie udało się wyrejestrować starego tokenu. Odśwież stronę.';
  return (err as any)?.message || 'Nieznany błąd';
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(safeNotificationPermission);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) setPermission(safeNotificationPermission());
  }, []);

  const registerToken = useCallback(async (playerName: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupported || !VAPID_KEY) {
      return { success: false, error: 'Brak wsparcia lub klucza VAPID' };
    }
    setIsRegistering(true);
    try {
      const existingRegs = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegs) {
        if (reg.active?.scriptURL?.includes('firebase-messaging-sw')) {
          await reg.unregister();
        }
      }
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { success: false, error: 'Brak zgody na powiadomienia' };

      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
      if (!token) return { success: false, error: 'Nie udało się pobrać tokenu FCM' };

      const tokenKey = hashToken(token);
      await set(ref(database, `fcmTokens/${tokenKey}`), {
        token,
        playerName: playerName || 'unknown',
        updatedAt: Date.now(),
        ua: navigator.userAgent.slice(0, 100),
      });

      try { localStorage.setItem('push-token-key', tokenKey); } catch { /* */ }
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
