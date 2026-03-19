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
import { useTheme } from './hooks/useTheme';
import { ThemeContext } from './context/ThemeContext';
import {  } from 'lucide-react';

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
      background: 'var(--co-void)', flexDirection: 'column', gap: 28,
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Top hazard stripe */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'repeating-linear-gradient(-45deg, var(--co-cyan) 0px, var(--co-cyan) 8px, rgba(0,0,0,0.6) 8px, rgba(0,0,0,0.6) 16px)',
        boxShadow: '0 0 16px rgba(0,229,255,0.8)', zIndex: 1000,
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Logo hex */}
        <div style={{
          width: 72, height: 72,
          border: '2px solid var(--co-cyan)',
          clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,229,255,0.06)',
          boxShadow: '0 0 30px rgba(0,229,255,0.35), inset 0 0 20px rgba(0,229,255,0.05)',
          animation: 'neon-orange 1.5s ease-in-out infinite',
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{ fontSize: '1.9rem', position: 'relative', zIndex: 1 }}>🏓</span>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.1em',
            color: 'var(--co-cyan)', textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(0,229,255,0.5)',
            margin: 0, lineHeight: 1,
          }}>CYBER-PONG</p>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.25em',
            color: 'rgba(0,229,255,0.45)', textTransform: 'uppercase', marginTop: 4,
            animation: 'flicker 2s infinite',
          }}>
            INITIALIZING SYSTEM...
          </p>
        </div>

        {/* Boot log */}
        <div style={{
          width: 280, background: '#07070A',
          border: '1px solid var(--co-border)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          padding: '10px 14px',
        }}>
          {[
            '> BOOT_SEQ: INITIATED',
            '> LOADING AGENT DATABASE...',
            '> CONNECTING TO FIREBASE...',
          ].map((line, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: i < 2 ? 'var(--co-green)' : 'rgba(0,229,255,0.4)',
              letterSpacing: '0.08em', margin: '2px 0',
              animation: i === 2 ? 'flicker 1.5s infinite' : 'none',
            }}>{line}</p>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width: 280, height: 3, background: '#1A1A14', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', width: '35%',
            background: 'linear-gradient(90deg, transparent, var(--co-cyan), var(--co-cyan))',
            boxShadow: '0 0 10px var(--co-cyan)',
            animation: 'loading-bar 1.1s ease-in-out infinite',
          }} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes loading-bar {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(700%); }
        }
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 24%, 55% { opacity: 0.2; }
        }
      `}} />
    </div>
  );
}


function CyberErrorScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--co-void)', padding: 24, flexDirection: 'column', gap: 20,
    }}>
      {/* Blood-red hazard stripe */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3,
        background: 'repeating-linear-gradient(-45deg, #CC0022 0px, #CC0022 8px, rgba(0,0,0,0.6) 8px, rgba(0,0,0,0.6) 16px)',
        boxShadow: '0 0 16px rgba(200,0,30,0.8)', zIndex: 1000,
      }} />

      <div style={{
        padding: '28px 24px', textAlign: 'center', maxWidth: 380, width: '100%',
        background: '#0D0008',
        border: '1px solid rgba(200,0,30,0.4)',
        clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
        boxShadow: '0 0 40px rgba(200,0,30,0.18), inset 0 0 30px rgba(200,0,30,0.04)',
        position: 'relative', overflow: 'hidden',
        animation: 'neon-yellow 2s ease-in-out infinite',
      }}>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 14, filter: 'drop-shadow(0 0 8px rgba(200,0,30,0.5))' }}>☠</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.12em', color: '#FF3333', marginBottom: 6, textTransform: 'uppercase',
            textShadow: '0 0 16px rgba(200,0,30,0.5)',
          }}>
            CONNECTION FAILURE
          </p>
          <div style={{
            padding: '10px 12px', background: 'rgba(200,0,30,0.06)',
            border: '1px solid rgba(200,0,30,0.2)', marginBottom: 20,
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', letterSpacing: '0.06em', lineHeight: 1.7 }}>
              {'>'} ERR: FIREBASE_TIMEOUT<br/>
              {'>'} Sprawdź internet lub plik .env<br/>
              {'>'} SYSTEM HALTED
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="cyber-button-yellow"
            style={{ padding: '13px 24px', width: '100%' }}
          >
            ⚡ RESTART SYSTEMU
          </button>
        </div>
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
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => setLoadTimeout(true), 8000);
    const unsub = subscribeToData((data) => {
      clearTimeout(timer);
      setAppData(data);
      setIsConnected(true);
      setIsLoading(false);
      setLoadTimeout(false);
    });
    const handleOffline = () => setIsConnected(false);
    const handleOnline  = () => setIsConnected(true);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
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
        {/* ── CONTAMINATED ZONE background ── */}
        <div aria-hidden="true" style={{
          position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', pointerEvents: 'none',
        }}>
          {/* Primary hazard glow — top center */}
          <div style={{
            position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
            width: '90vw', height: '70vh',
            background: 'radial-gradient(ellipse at center top, rgba(0,229,255,0.08) 0%, rgba(180,55,0,0.03) 45%, transparent 72%)',
          }} />
          {/* Secondary warm glow — bottom-left */}
          <div style={{
            position: 'absolute', bottom: '-10%', left: '-5%',
            width: '55vw', height: '55vh',
            background: 'radial-gradient(ellipse at bottom left, rgba(0,180,216,0.04) 0%, transparent 65%)',
          }} />
          {/* Acid accent — mid right */}
          <div style={{
            position: 'absolute', top: '40%', right: '-5%',
            width: '35vw', height: '40vh',
            background: 'radial-gradient(ellipse at right center, rgba(0,229,255,0.02) 0%, transparent 60%)',
          }} />
          {/* Fine dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, var(--dot-color, rgba(0,229,255,0.07)) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }} />
          {/* Horizontal scan line at mid height */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.06) 20%, rgba(0,229,255,0.12) 50%, rgba(0,229,255,0.06) 80%, transparent 100%)',
          }} />
          {/* Coarse grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }} />
          {/* Ground plane glow */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '30vh',
            background: 'linear-gradient(to top, rgba(0,229,255,0.03) 0%, transparent 100%)',
          }} />
          {/* Vertical side accent lines */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '1px',
            background: 'linear-gradient(to bottom, rgba(0,229,255,0.15) 0%, transparent 40%)',
          }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px',
            background: 'linear-gradient(to bottom, rgba(0,229,255,0.15) 0%, transparent 40%)',
          }} />
        </div>
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
                playSound={playSound}
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
