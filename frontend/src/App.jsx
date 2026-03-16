import { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components/common/Toast';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import DashboardTab from './components/dashboard/DashboardTab';
import AttendanceTab from './components/attendance/AttendanceTab';
import AdminTab from './components/admin/AdminTab';
import HistoryTab from './components/history/HistoryTab';
import PlayersTab from './components/players/PlayersTab';
import { subscribeToData } from './firebase/index';
import { SOUND_TYPES, TABS } from './constants';
import { SpinnerOverlay } from './components/common/LoadingSkeleton';
import PWAInstallBanner from './components/common/PWAInstallBanner';
import { useAudio } from './hooks/useAudio';
import { useScrolled } from './hooks/useScrolled';
import { ThemeContext } from './context/ThemeContext';
import { Zap } from 'lucide-react';

const INITIAL_APP_DATA = {
  summary: {},
  players: [],
  playerNames: [],
  defaultMultiPlayers: [],
  deletedPlayers: [],
  paidUntilWeek: {},
  history: [],
};

function CyberLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cyber-black)', flexDirection: 'column', gap: 24,
    }}>
      {/* Top yellow bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'var(--cyber-accent)', boxShadow: '0 0 12px var(--cyber-accent)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Logo mark */}
        <div style={{
          width: 60, height: 60,
          border: '2px solid var(--cyber-accent)',
          clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(129,140,248,0.05)',
          boxShadow: '0 0 20px rgba(129,140,248,0.3)',
          animation: 'neon-pulse-yellow 1.5s ease-in-out infinite',
        }}>
          <span style={{ fontSize: '1.6rem' }}>🏓</span>
        </div>

        <div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.25em',
            color: 'var(--cyber-accent)', textTransform: 'uppercase', textAlign: 'center',
            animation: 'flicker 2s infinite',
          }}>
            ŁADOWANIE SYSTEMU...
          </p>
        </div>

        {/* Loading bar */}
        <div style={{
          width: 200, height: 2,
          background: '#1a1a1a',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: '40%',
            background: 'var(--cyber-accent)',
            boxShadow: '0 0 8px var(--cyber-accent)',
            animation: 'loading-bar 1.2s ease-in-out infinite',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes loading-bar {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(550%); }
        }
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 24%, 55% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function CyberErrorScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cyber-black)', padding: 24, flexDirection: 'column', gap: 20,
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'var(--cyber-red)', boxShadow: '0 0 12px var(--cyber-red)' }} />

      <div style={{
        padding: 32, textAlign: 'center', maxWidth: 360,
        background: '#0d0d12', border: '1px solid rgba(255,0,51,0.3)',
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        boxShadow: '0 0 30px rgba(255,0,51,0.15)',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>💀</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--cyber-red)', marginBottom: 8, textTransform: 'uppercase' }}>
          CONNECTION FAILURE
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cyber-text-dim)', marginBottom: 20 }}>
          Sprawdź internet lub konfigurację Firebase (.env)
        </p>
        <button
          onClick={() => window.location.reload()}
          className="cyber-button-yellow"
          style={{ padding: '12px 24px', width: '100%', fontSize: '0.7rem' }}
        >
          ⚡ RESTART SYSTEMU
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const [activeTab,    setActiveTab]    = useState(TABS.DASHBOARD);
  const [isMuted,      setIsMuted]      = useState(false);
  const [appData,      setAppData]      = useState(INITIAL_APP_DATA);
  const [isConnected,  setIsConnected]  = useState(false);
  const [isLoading,    setIsLoading]    = useState(true);
  const [loadTimeout,  setLoadTimeout]  = useState(false);

  const scrolled     = useScrolled();
  const { playSound } = useAudio(isMuted);

  useEffect(() => {
    const timer = setTimeout(() => setLoadTimeout(true), 8000);
    const unsub = subscribeToData((data) => {
      clearTimeout(timer);
      setAppData(data);
      setIsConnected(true);
      setIsLoading(false);
      setLoadTimeout(false);
    });
    return () => { clearTimeout(timer); if (typeof unsub === 'function') unsub(); };
  }, []);

  const switchTab = useCallback((id) => {
    playSound(SOUND_TYPES.TAB);
    setActiveTab(id);
  }, [playSound]);

  if (isLoading) {
    if (loadTimeout) return <CyberErrorScreen />;
    return <CyberLoadingScreen />;
  }

  return (
    <ThemeContext.Provider value="cyber">
      <div
        className="min-h-screen p-4 md:p-8 relative z-10"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', position: 'relative' }}
      >
        {/* ── Cyberpunk background ── */}
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none',
        }}>
          {/* Deep radial glow — top center */}
          <div style={{
            position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
            width: '80vw', height: '60vh',
            background: 'radial-gradient(ellipse at center top, rgba(99,102,241,0.09) 0%, rgba(67,56,202,0.04) 40%, transparent 70%)',
          }} />
          {/* Secondary glow — bottom right */}
          <div style={{
            position: 'absolute', bottom: '-5%', right: '-10%',
            width: '50vw', height: '50vh',
            background: 'radial-gradient(ellipse at bottom right, rgba(139,92,246,0.06) 0%, transparent 65%)',
          }} />
          {/* Subtle grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(129,140,248,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(129,140,248,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }} />
          {/* Perspective grid floor — bottom third */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40vh',
            backgroundImage: `
              linear-gradient(rgba(129,140,248,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(129,140,248,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
          }} />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <Header
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isConnected={isConnected}
            scrolled={scrolled}
          />
          <Navigation activeTab={activeTab} setActiveTab={switchTab} />
          <main className="main-content">
            {activeTab === TABS.DASHBOARD  && (
              <DashboardTab
                data={{ summary: appData.summary, players: appData.players, paidUntilWeek: appData.paidUntilWeek, payments: appData.payments }}
                history={appData.history}
                playSound={playSound}
              />
            )}
            {activeTab === TABS.ATTENDANCE && (
              <AttendanceTab
                players={appData.players}
                history={appData.history}
                summary={appData.summary}
              />
            )}
            {activeTab === TABS.ADMIN && (
              <AdminTab
                playerNames={appData.playerNames}
                defaultMultiPlayers={appData.defaultMultiPlayers}
                history={appData.history}
                setActiveTab={switchTab}
                playSound={playSound}
              />
            )}
            {activeTab === TABS.HISTORY && (
              <HistoryTab
                history={appData.history}
                playerNames={appData.playerNames}
                playSound={playSound}
              />
            )}
            {activeTab === TABS.PLAYERS && (
              <PlayersTab
                players={appData.players}
                deletedPlayers={appData.deletedPlayers}
                defaultMultiPlayers={appData.defaultMultiPlayers}
                playSound={playSound}
              />
            )}
          </main>
        </div>
        <PWAInstallBanner />
      </div>
    </ThemeContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
