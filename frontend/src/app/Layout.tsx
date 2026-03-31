import { Outlet, useNavigate, useLocation } from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import PWAInstallBanner from '@/components/common/PWAInstallBanner';
import { ThemeContext } from '@/context/ThemeContext';
import { useConnectionStatus } from './providers/AppDataProvider';
import { useThemeContext } from './providers/ThemeProvider';
import { useAudio } from '@/hooks/useAudio';
import { useScrolled } from '@/hooks/useScrolled';
import { SOUND_TYPES } from '@/constants';
import type { TabId } from '@/types/ui';

const PATH_TO_TAB: Record<string, TabId> = {
  '/': 'dashboard',
  '/attendance': 'attendance',
  '/admin': 'admin',
  '/history': 'history',
  '/players': 'players',
};

const TAB_TO_PATH: Record<TabId, string> = {
  dashboard: '/',
  attendance: '/attendance',
  admin: '/admin',
  history: '/history',
  players: '/players',
};

export default function Layout() {
  const [isMuted, setIsMuted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useConnectionStatus();
  const { theme, toggle: toggleTheme } = useThemeContext();
  const scrolled = useScrolled();
  const { playSound } = useAudio(isMuted);

  const activeTab = PATH_TO_TAB[location.pathname] || 'dashboard';

  const switchTab = useCallback((id: string) => {
    playSound(SOUND_TYPES.TAB);
    const path = TAB_TO_PATH[id as TabId] || '/';
    navigate(path);
  }, [playSound, navigate]);

  useEffect(() => {
    let unsubFcm: (() => void) | null = null;
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const messaging = getMessaging();
        unsubFcm = onMessage(messaging, async (payload) => {
          const { title, body } = payload.notification || {};
          if (!title) return;
          try {
            const reg = await navigator.serviceWorker?.ready;
            await reg?.showNotification(title, {
              body: body || '',
              icon: '/icon-192v2.png',
              badge: '/icon-192v2.png',
              vibrate: [100, 50, 100],
              tag: (payload.data as any)?.tag || (payload.data as any)?.type || 'default',
              renotify: true,
              data: { url: (payload.data as any)?.url || '/?tab=dashboard', ...payload.data },
            });
          } catch (err) {
            console.warn('showNotification failed:', err);
            try { new Notification(title, { body: body || '', icon: '/icon-192v2.png' }); } catch { /* */ }
          }
        });
      }
    } catch (err) {
      console.warn('getMessaging() failed:', err);
    }
    return () => { if (unsubFcm) unsubFcm(); };
  }, []);

  useEffect(() => {
    const swContainer = navigator.serviceWorker;
    if (!swContainer) return;

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'NOTIFICATION_CLICK') return;
      const url = new URL(event.data.url);
      const tab = url.searchParams.get('tab');

      if (tab === 'attendance') {
        navigate('/attendance' + (url.searchParams.get('player') ? `?player=${url.searchParams.get('player')}` : ''));
      } else if (tab === 'dashboard') {
        navigate('/');
      } else if (tab === 'admin') {
        navigate('/admin');
      }
    };

    swContainer.addEventListener('message', handleSwMessage);
    return () => swContainer.removeEventListener('message', handleSwMessage);
  }, [navigate]);

  return (
    <ThemeContext.Provider value={theme}>
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
          <main className="main-content">
            <Outlet context={{ playSound }} />
          </main>
        </div>
        <PWAInstallBanner />
      </div>
    </ThemeContext.Provider>
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
        background: 'radial-gradient(ellipse at center top, rgba(0,229,255,0.08) 0%, rgba(180,55,0,0.03) 45%, transparent 72%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-5%',
        width: '55vw', height: '55vh',
        background: 'radial-gradient(ellipse at bottom left, rgba(0,180,216,0.04) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '-5%',
        width: '35vw', height: '40vh',
        background: 'radial-gradient(ellipse at right center, rgba(0,229,255,0.02) 0%, transparent 60%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 1px 1px, var(--dot-color, rgba(0,229,255,0.07)) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(to top, rgba(0,229,255,0.03) 0%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '1px',
        background: 'linear-gradient(to bottom, rgba(0,229,255,0.15) 0%, transparent 40%)',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px',
        background: 'linear-gradient(to bottom, rgba(0,229,255,0.15) 0%, transparent 40%)',
      }} />
    </div>
  );
}
