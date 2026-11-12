import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { loadMessagingSdk } from '@/lib/firebase/messaging';
import { routeFromNotificationUrl } from '@/utils/notificationRoute';

const NOTIFICATION_ICON = '/icon-192v3.png';

/**
 * `NotificationOptions` z lib.dom nie zna pól obsługiwanych tylko przez
 * Service Workera (wibracje, ponowne powiadomienie o tym samym tagu).
 */
interface SwNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  renotify?: boolean;
}

/** Wiadomość, którą Service Worker wysyła po kliknięciu w powiadomienie. */
interface NotificationClickMessage {
  type: 'NOTIFICATION_CLICK';
  url: string;
}

/**
 * `MessageEvent.data` to `any` — cokolwiek może przysłać dowolny worker
 * z tego origin. Sprawdzamy kształt, zanim cokolwiek z tego przeczytamy.
 */
function isNotificationClick(data: unknown): data is NotificationClickMessage {
  if (typeof data !== 'object' || data === null) return false;
  const message = data as Record<string, unknown>;
  return message.type === 'NOTIFICATION_CLICK' && typeof message.url === 'string';
}

function currentPermission(): NotificationPermission {
  try {
    return typeof Notification === 'undefined' ? 'default' : Notification.permission;
  } catch {
    return 'default';
  }
}

/**
 * Zgoda na powiadomienia, śledzona na bieżąco.
 *
 * Odczyt tylko przy montowaniu przegapiał zgodę udzieloną później (baner push
 * na stronie głównej): powiadomienia przy otwartej apce zaczynały działać
 * dopiero po jej przeładowaniu. Permissions API zgłasza zmianę od razu; tam,
 * gdzie go nie ma, zostaje odczyt startowy — jak dotąd.
 */
function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] = useState(currentPermission);

  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const sync = () => setPermission(currentPermission());

    navigator.permissions?.query({ name: 'notifications' })
      .then((result) => {
        if (cancelled) return;
        status = result;
        status.addEventListener('change', sync);
        sync();
      })
      .catch(() => { /* przeglądarka nie zna tego uprawnienia — zostaje odczyt startowy */ });

    return () => {
      cancelled = true;
      status?.removeEventListener('change', sync);
    };
  }, []);

  return permission;
}

async function showForegroundNotification(title: string, body: string, data: Record<string, string>) {
  try {
    const registration = await navigator.serviceWorker?.ready;
    const options: SwNotificationOptions = {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      vibrate: [100, 50, 100],
      tag: data.tag || data.type || 'default',
      renotify: true,
      data: { ...data, url: data.url || '/?tab=dashboard' },
    };
    await registration?.showNotification(title, options);
  } catch (err) {
    console.warn('showNotification failed:', err);
    try { new Notification(title, { body, icon: NOTIFICATION_ICON }); } catch { /* powiadomienia niedostępne */ }
  }
}

/**
 * Powiadomienia FCM przy otwartej aplikacji.
 *
 * Gdy karta jest na pierwszym planie, przeglądarka nie pokazuje powiadomienia
 * sama — SDK oddaje je stronie. Wyświetlamy je przez Service Workera, żeby
 * wyglądały i działały (kliknięcie, tag) tak samo jak te w tle.
 */
export function useForegroundNotifications(): void {
  const permission = useNotificationPermission();

  useEffect(() => {
    if (permission !== 'granted') return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    loadMessagingSdk()
      .then(({ getMessaging, onMessage }) => {
        if (cancelled) return;
        unsubscribe = onMessage(getMessaging(), (payload) => {
          const { title, body } = payload.notification || {};
          if (!title) return;
          void showForegroundNotification(title, body || '', payload.data ?? {});
        });
      })
      // `getMessaging()` rzuca w przeglądarkach bez obsługi push — apka działa dalej.
      .catch((err: unknown) => console.warn('getMessaging() failed:', err));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [permission]);
}

/**
 * Przejście do zakładki wskazanej przez kliknięte powiadomienie — zarówno gdy
 * apka jest otwarta (wiadomość z workera), jak i przy zimnym starcie.
 */
export function useNotificationNavigation(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const swContainer = navigator.serviceWorker;
    if (!swContainer) return undefined;

    const handleSwMessage = (event: MessageEvent) => {
      if (!isNotificationClick(event.data)) return;

      let url: URL;
      try {
        url = new URL(event.data.url, window.location.origin);
      } catch {
        return; // uszkodzony adres z workera — ignorujemy zamiast wywracać aplikację
      }

      const target = routeFromNotificationUrl(url);
      if (target) void navigate(target);
    };

    swContainer.addEventListener('message', handleSwMessage);
    return () => swContainer.removeEventListener('message', handleSwMessage);
  }, [navigate]);

  // Zimny start z powiadomienia: worker otwiera okno pod `/?tab=…`, a wiadomość
  // z workera trafia tylko do już otwartej apki. Bez tego kliknięcie w
  // powiadomienie przy zamkniętej apce zawsze lądowało na ekranie startowym.
  useEffect(() => {
    const target = routeFromNotificationUrl(new URL(window.location.href));
    if (target) void navigate(target, { replace: true });
    // Tylko przy pierwszym montowaniu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
