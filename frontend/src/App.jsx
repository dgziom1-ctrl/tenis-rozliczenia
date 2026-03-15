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

const THEME = 'cyber';

const INITIAL_APP_DATA = {
  summary: {},
  players: [],
  playerNames: [],
  defaultMultiPlayers: [],
  deletedPlayers: [],
  paidUntilWeek: {},
  history: [],
};

function AppContent() {
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [isMuted, setIsMuted]     = useState(false);
  const [appData, setAppData]     = useState(INITIAL_APP_DATA);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);

  const scrolled = useScrolled();
  const { playSound } = useAudio(isMuted, THEME);

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
    if (loadTimeout) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>Brak połączenia</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '24px' }}>Sprawdź internet lub konfigurację Firebase (.env)</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 600, cursor: 'pointer', fontSize: '14px',
              }}
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
    <ThemeContext.Provider value={THEME}>
      <div
        className="min-h-screen p-4 md:p-8 relative z-10"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="max-w-7xl mx-auto relative">
          <Header
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isConnected={isConnected}
            theme={THEME}
            scrolled={scrolled}
          />
          <Navigation
            activeTab={activeTab}
            setActiveTab={switchTab}
          />
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
            {activeTab === TABS.ADMIN      && (
              <AdminTab
                playerNames={appData.playerNames}
                defaultMultiPlayers={appData.defaultMultiPlayers}
                history={appData.history}
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
