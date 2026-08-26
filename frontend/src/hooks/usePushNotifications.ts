import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { registerServiceWorker } from '@/utils/serviceWorker';
import { MAX_PLAYER_NAME_LENGTH } from '@/utils/validation';

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

/** Wyciąga `message`/`code` z błędu dowolnego kształtu, bez rzutowania na `any`. */
function errorField(err: unknown, field: 'message' | 'code'): string {
  if (typeof err !== 'object' || err === null) return '';
  const value = (err as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

/** Ile najdłużej czekamy na aktywację workera, zanim uznamy to za awarię. */
const ACTIVATION_TIMEOUT_MS = 10_000;

/** `navigator.serviceWorker.ready` bez gwarancji, że kiedykolwiek się rozstrzygnie. */
function waitForActivation(): Promise<boolean> {
  return Promise.race([
    navigator.serviceWorker.ready.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ACTIVATION_TIMEOUT_MS)),
  ]);
}

function friendlyPushError(err: unknown): string {
  const msg = errorField(err, 'message').toLowerCase();
  const code = errorField(err, 'code');

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
  return errorField(err, 'message') || 'Nieznany błąd';
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
      // Zgoda przed czymkolwiek innym: Safari (w tym PWA na iOS) wymaga, by
      // `requestPermission` padło jeszcze w oknie interakcji użytkownika. Każde
      // wcześniejsze `await` może to okno zamknąć i przeglądarka odrzuca prośbę
      // błędem, który wygląda jak zupełnie inna awaria.
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { success: false, error: 'Brak zgody na powiadomienia' };

      // Korzystamy z workera zarejestrowanego przy starcie aplikacji. Poprzednia
      // wersja wyrejestrowywała go i zakładała od nowa — to gubiło cache powłoki
      // i na moment zostawiało apkę bez obsługi żądań. Dodatkowo sprawdzała samo
      // `reg.active`, więc rejestrację w trakcie instalacji po cichu pomijała.
      const swReg = await registerServiceWorker();
      if (!swReg) return { success: false, error: 'Service Worker niedostępny w tej przeglądarce.' };

      // `ready` czeka na aktywację i potrafi nie rozstrzygnąć się nigdy. Bez
      // limitu przycisk kręciłby się bez końca, bez błędu i bez wyjścia.
      const activated = await waitForActivation();
      if (!activated) return { success: false, error: 'Service Worker nie uruchomił się w oczekiwanym czasie. Odśwież stronę.' };

      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
      if (!token) return { success: false, error: 'Nie udało się pobrać tokenu FCM' };

      const tokenKey = hashToken(token);
      await set(ref(database, `fcmTokens/${tokenKey}`), {
        token,
        // Reguły bazy odrzucają dłuższe wartości — przycinamy tutaj, żeby
        // zapis nie padał z niezrozumiałym błędem uprawnień.
        playerName: (playerName || 'unknown').slice(0, MAX_PLAYER_NAME_LENGTH),
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
