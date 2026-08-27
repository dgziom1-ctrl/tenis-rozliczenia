import { Outlet, useNavigate, useLocation } from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import PWAInstallBanner from '@/components/common/PWAInstallBanner';
import { useConnectionStatus } from './providers/appDataContext';
import { useThemeContext } from './providers/themeContext';
import { useAudio } from '@/hooks/useAudio';
import { useScrolled } from '@/hooks/useScrolled';
import { SOUND_TYPES, TAB_PATHS, PATH_TO_TAB } from '@/constants';
import { CLIP } from '@/constants/styles';

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

export default function Layout() {
  const [isMuted, setIsMuted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, hasData, bootTimedOut, retry } = useConnectionStatus();
  const { theme, toggle: toggleTheme } = useThemeContext();
  const scrolled = useScrolled();
  const { playSound } = useAudio(isMuted);

  const activeTab = PATH_TO_TAB[location.pathname] ?? 'dashboard';

  const switchTab = useCallback((id: string) => {
    playSound(SOUND_TYPES.TAB);
    void navigate(TAB_PATHS[id] ?? '/');
  }, [playSound, navigate]);

  useEffect(() => {
    let unsubFcm: (() => void) | null = null;

    const showForegroundNotification = async (title: string, body: string, data: Record<string, string>) => {
      try {
        const reg = await navigator.serviceWorker?.ready;
        const options: SwNotificationOptions = {
          body,
          icon: '/icon-192v2.png',
          badge: '/icon-192v2.png',
          vibrate: [100, 50, 100],
          tag: data.tag || data.type || 'default',
          renotify: true,
          data: { ...data, url: data.url || '/?tab=dashboard' },
        };
        await reg?.showNotification(title, options);
      } catch (err) {
        console.warn('showNotification failed:', err);
        try { new Notification(title, { body, icon: '/icon-192v2.png' }); } catch { /* powiadomienia niedostępne */ }
      }
    };

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        unsubFcm = onMessage(getMessaging(), (payload) => {
          const { title, body } = payload.notification || {};
          if (!title) return;
          void showForegroundNotification(title, body || '', payload.data ?? {});
        });
      }
    } catch (err) {
      console.warn('getMessaging() failed:', err);
    }
    return () => { if (unsubFcm) unsubFcm(); };
  }, []);

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

      const tab = url.searchParams.get('tab');
      if (tab === 'attendance') {
        const player = url.searchParams.get('player');
        void navigate(player ? `/attendance?player=${encodeURIComponent(player)}` : '/attendance');
      } else if (tab === 'dashboard') {
        void navigate('/');
      } else if (tab === 'admin') {
        void navigate('/admin');
      }
    };

    swContainer.addEventListener('message', handleSwMessage);
    return () => swContainer.removeEventListener('message', handleSwMessage);
  }, [navigate]);

  return (
    <div
      className="min-h-screen p-4 md:p-8 relative z-10"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', position: 'relative' }}
    >
      <CyberBackground />
      <div className="max-w-7xl mx-auto relative">
        <Header
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isConnected={isConnected}
          scrolled={scrolled}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Navigation activeTab={activeTab} setActiveTab={switchTab} />
        {/* Także przy pozornie sprawnym połączeniu: baza potrafi zgłaszać
            „połączono”, a mimo to nie przysłać żadnych danych. Bez tego
            użytkownik zostaje z pustymi listami, bez wyjaśnienia i bez przycisku. */}
        {(!isConnected || (bootTimedOut && !hasData)) && (
          <OfflineBanner hasData={hasData} onRetry={retry} />
        )}
        <main className="main-content page-enter" key={location.pathname}>
          <Outlet context={{ playSound }} />
        </main>
      </div>
      <PWAInstallBanner />
    </div>
  );
}

/**
 * Baner braku połączenia.
 *
 * Rozróżnia dwa przypadki, bo mylą się użytkownikom: „mam dane, ale nie zapiszę
 * zmian” to zupełnie inna sytuacja niż „nie mam żadnych danych i patrzę na puste
 * listy”. W drugiej dokładamy przycisk ponowienia, bo interfejs wpuszcza tu po
 * przekroczeniu terminu oczekiwania i bez niego nie byłoby jak spróbować dalej.
 */
function OfflineBanner({ hasData, onRetry }: { hasData: boolean; onRetry: () => void }) {
  return (
    <div
      role="status"
      style={{
        margin: '0 0 16px',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--co-amber-dim)',
        border: '1px solid var(--co-amber)',
        clipPath: CLIP.smallCard,
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>⚠</span>
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--co-amber)', fontSize: '0.8125rem',
        }}>
          Brak połączenia
        </p>
        <p style={{
          margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: 'var(--co-dim)', letterSpacing: '0.06em', lineHeight: 1.5,
        }}>
          {hasData
            ? 'Pracujesz na ostatnich danych. Zmiany (wpłaty, sesje) nie zapiszą się, dopóki nie wróci sieć.'
            : 'Nie udało się pobrać danych. Apka działa, ale listy będą puste do powrotu sieci.'}
        </p>
      </div>
      {!hasData && (
        <button onClick={onRetry} className="cyber-button-yellow"
          style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          ↻ Ponów
        </button>
      )}
    </div>
  );
}

function CyberBackground() {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: '90vw', height: '70vh',
        background: 'radial-gradient(ellipse at center top, var(--co-tint-hi) 0%, var(--co-tint) 45%, transparent 72%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-5%',
        width: '55vw', height: '55vh',
        background: 'radial-gradient(ellipse at bottom left, var(--co-tint) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '-5%',
        width: '35vw', height: '40vh',
        background: 'radial-gradient(ellipse at right center, var(--co-tint) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, var(--dot-color, var(--co-tint)) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(to top, var(--co-tint) 0%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '1px',
        background: 'linear-gradient(to bottom, var(--co-tint-line) 0%, transparent 40%)',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px',
        background: 'linear-gradient(to bottom, var(--co-tint-line) 0%, transparent 40%)',
      }} />
    </div>
  );
}
