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

const INITIAL_APP_DATA = {
  summary: {},
  players: [],
  playerNames: [],
  defaultMultiPlayers: [],
  deletedPlayers: [],
  paidUntilWeek: {},
  history: [],
};

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('ponk-theme') || 'cyber'; } catch { return 'cyber'; }
  });

  const persistTheme = useCallback((next) => {
    setTheme(next);
    try { localStorage.setItem('ponk-theme', next); } catch {}
    document.body.classList.toggle('theme-arcade-bg', next === 'arcade');
  }, []);

  // Sync on initial load
  useEffect(() => {
    const stored = (() => { try { return localStorage.getItem('ponk-theme'); } catch { return null; } })();
    document.body.classList.toggle('theme-arcade-bg', stored === 'arcade');
  }, []);

  return [theme, persistTheme];
}

function useScrolled(threshold = 80) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}

function AppContent() {
  const [activeTab,   setActiveTab]   = useState(TABS.DASHBOARD);
  const [isMuted,     setIsMuted]     = useState(false);
  const [appData,     setAppData]     = useState(INITIAL_APP_DATA);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);

  const [theme, persistTheme] = useTheme();
  const scrolled = useScrolled();
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

  const toggleTheme = useCallback(() => {
    const next = theme === 'cyber' ? 'arcade' : 'cyber';
    persistTheme(next);
    playSound(SOUND_TYPES.COIN);
  }, [theme, persistTheme, playSound]);


  if (isLoading) {
    if (loadTimeout) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div>
            <div className="text-5xl mb-4">😵</div>
            <p className="text-cyan-300 font-black text-lg mb-2">Brak połączenia</p>
            <p className="text-cyan-700 text-sm mb-6">Sprawdź internet lub konfigurację Firebase (.env)</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl border-2 border-cyan-500 text-cyan-300 hover:bg-cyan-500 hover:text-black font-bold transition-all"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      );
    }
    return <SpinnerOverlay message="Ładowanie..." />;
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
        />
        <main
          className="main-content"
          style={scrolled ? { paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' } : {}}
        >
          {activeTab === TABS.DASHBOARD  && (
            <DashboardTab
              data={{ summary: appData.summary, players: appData.players, paidUntilWeek: appData.paidUntilWeek }}
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
          {activeTab === TABS.ADMIN      && (
            <AdminTab
              playerNames={appData.playerNames}
              defaultMultiPlayers={appData.defaultMultiPlayers}
              setActiveTab={switchTab}
              playSound={playSound}
            />
          )}
          {activeTab === TABS.HISTORY    && (
            <HistoryTab
              history={appData.history}
              playerNames={appData.playerNames}
              playSound={playSound}
            />
          )}
          {activeTab === TABS.PLAYERS    && (
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
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
