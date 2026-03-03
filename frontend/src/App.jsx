import { useState, useEffect, useRef, useCallback } from 'react';
import { ToastProvider } from './components/common/Toast';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import DashboardTab from './components/dashboard/DashboardTab';
import AttendanceTab from './components/attendance/AttendanceTab';
import AdminTab from './components/admin/AdminTab';
import HistoryTab from './components/history/HistoryTab';
import PlayersTab from './components/players/PlayersTab';
import { subscribeToData } from './firebase/index';
import { SOUND_TYPES } from './constants';
import { SpinnerOverlay } from './components/common/LoadingSkeleton';
import PWAInstallBanner from './components/common/PWAInstallBanner';

const synth = {
  ctx: null,
  init: () => {
    if (!synth.ctx) {
      synth.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (required on mobile after user interaction)
    if (synth.ctx.state === 'suspended') {
      synth.ctx.resume().catch(() => {});
    }
  },
  play: (type, isMuted) => {
    if (isMuted) return;
    try {
      synth.init();
      const ctx = synth.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === SOUND_TYPES.TAB) {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
      } else if (type === SOUND_TYPES.CLICK) {
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now); osc.stop(now + 0.03);
      } else if (type === SOUND_TYPES.SUCCESS) {
        osc.type = 'square'; osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        osc.frequency.setValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
      } else if (type === SOUND_TYPES.DELETE) {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
      } else if (type === SOUND_TYPES.COIN) {
        const osc2  = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2); gain2.connect(ctx.destination);
        osc.type  = 'square'; osc.frequency.setValueAtTime(987, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
        osc2.type = 'square'; osc2.frequency.setValueAtTime(1318, now + 0.12);
        gain2.gain.setValueAtTime(0.14, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.start(now + 0.12); osc2.stop(now + 0.35);
      }
    } catch (err) {
      console.warn('Sound playback failed:', err);
    }
  }
};

function AppContent() {
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [isMuted,     setIsMuted]     = useState(false);
  const [theme,       setTheme]       = useState(() => {
    try { return localStorage.getItem('ponk-theme') || 'cyber'; } catch { return 'cyber'; }
  });
  const [appData, setAppData] = useState({
    summary: {}, players: [], playerNames: [],
    defaultMultiPlayers: [], deletedPlayers: [], history: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    const unsub = subscribeToData((data) => {
      setAppData(data);
      setIsConnected(true);
      setIsLoading(false);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'cyber' ? 'arcade' : 'cyber';
    setTheme(next);
    try { localStorage.setItem('ponk-theme', next); } catch {}
    synth.play(SOUND_TYPES.COIN, isMuted);
  };

  const playSound = (t) => synth.play(t, isMuted);
  const switchTab = (id) => { playSound(SOUND_TYPES.TAB); setActiveTab(id); };

  // ── Swipe navigation ──────────────────────────────────────────────────────
  const TAB_ORDER = ['dashboard', 'attendance', 'admin', 'history', 'players'];
  const touchStart = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStart.current  = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStart.current = null;

    // Ignoruj jeśli bardziej pionowy niż poziomy (scroll)
    if (Math.abs(dy) > Math.abs(dx)) return;
    // Minimalny próg 60px
    if (Math.abs(dx) < 60) return;
    // Ignoruj gdy gest zaczyna/kończy się na inpucie, select lub modalu (np. datepicker)
    const target = e.target || e.srcElement;
    const tag = target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (target?.closest?.('[role="dialog"]')) return;

    const currentIdx = TAB_ORDER.indexOf(activeTab);
    if (dx < 0) {
      // Swipe lewo → panel w prawo (następny)
      const next = TAB_ORDER[currentIdx + 1];
      if (next) switchTab(next);
    } else {
      // Swipe prawo → panel w lewo (poprzedni)
      const prev = TAB_ORDER[currentIdx - 1];
      if (prev) switchTab(prev);
    }
  }, [activeTab]);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isLoading) {
    return <SpinnerOverlay message="Łączenie z bazą danych..." />;
  }

  return (
    <div
      className={`min-h-screen p-4 md:p-8 relative z-10 transition-colors duration-300 ${theme === 'arcade' ? 'theme-arcade' : ''}`}
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-7xl mx-auto relative">
        <Header
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isConnected={isConnected}
          theme={theme}
          onToggleTheme={toggleTheme}
          scrolled={scrolled}
        />
        <Navigation
          activeTab={activeTab}
          setActiveTab={switchTab}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main
          className="main-content"
          style={scrolled ? { paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' } : {}}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeTab === 'dashboard'  && <DashboardTab  data={{ summary: appData.summary, players: appData.players }} history={appData.history} playSound={playSound} />}
          {activeTab === 'attendance' && <AttendanceTab players={appData.players} history={appData.history} summary={appData.summary} />}
          {activeTab === 'admin'      && <AdminTab      playerNames={appData.playerNames} defaultMultiPlayers={appData.defaultMultiPlayers} setActiveTab={switchTab} playSound={playSound} />}
          {activeTab === 'history'    && <HistoryTab    history={appData.history} playerNames={appData.playerNames} playSound={playSound} />}
          {activeTab === 'players'    && <PlayersTab    players={appData.players} deletedPlayers={appData.deletedPlayers} playSound={playSound} />}
        </main>
      </div>
      <PWAInstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
