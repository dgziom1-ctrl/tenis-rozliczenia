import { useState, useEffect, lazy, Suspense } from 'react';
import { useAudio } from './hooks/useAudio';
import { AppProvider, useAppData } from './contexts/AppContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import { SECRET_EASTER_EGG, TABS, SOUND_TYPES } from './constants';

const DashboardTab = lazy(() => import('./components/dashboard/DashboardTab'));
const AttendanceTab = lazy(() => import('./components/attendance/AttendanceTab'));
const AdminTab = lazy(() => import('./components/admin/AdminTab'));
const HistoryTab = lazy(() => import('./components/history/HistoryTab'));
const PlayersTab = lazy(() => import('./components/players/PlayersTab'));
const PongGame = lazy(() => import('./components/easter/PongGame'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-cyan-400 animate-pulse">Ładowanie...</div>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [isMuted, setIsMuted] = useState(false);
  const [pongOpen, setPongOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ponk-theme') || 'cyber';
    } catch {
      return 'cyber';
    }
  });

  const { appData, isConnected } = useAppData();
  const { playSound } = useAudio(isMuted);

  useEffect(() => {
    const handleKeydown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();
      const buffer = (window._easterBuffer || '') + key;
      window._easterBuffer = buffer.slice(-SECRET_EASTER_EGG.length);

      if (window._easterBuffer === SECRET_EASTER_EGG) {
        setPongOpen(true);
        window._easterBuffer = '';
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'cyber' ? 'arcade' : 'cyber';
    setTheme(nextTheme);
    try {
      localStorage.setItem('ponk-theme', nextTheme);
    } catch {}
    playSound(SOUND_TYPES.COIN);
  };

  const switchTab = (id) => {
    playSound(SOUND_TYPES.TAB);
    setActiveTab(id);
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 relative z-10 transition-colors duration-300 ${theme === 'arcade' ? 'theme-arcade' : ''}`}>
      <div className="max-w-7xl mx-auto relative">
        <Header
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isConnected={isConnected}
          onOpenPong={() => setPongOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <Navigation
          activeTab={activeTab}
          setActiveTab={switchTab}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main>
          <Suspense fallback={<LoadingSpinner />}>
            {activeTab === TABS.DASHBOARD && (
              <DashboardTab
                data={{ summary: appData.summary, players: appData.players }}
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
                playSound={playSound}
              />
            )}
          </Suspense>
        </main>
        {pongOpen && (
          <Suspense fallback={null}>
            <PongGame onClose={() => setPongOpen(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
