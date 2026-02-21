import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import DashboardTab from './components/dashboard/DashboardTab';
import AttendanceTab from './components/attendance/AttendanceTab';
import AdminTab from './components/admin/AdminTab';
import HistoryTab from './components/history/HistoryTab';
import PlayersTab from './components/players/PlayersTab';
import { subscribeToData } from './firebase';   // ← FIREBASE zamiast fetch()

// SOUND ENGINE (Web Audio API) — bez zmian
const synth = {
  ctx: null,
  init: () => { if (!synth.ctx) synth.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  play: (type, isMuted) => {
    if (isMuted) return;
    synth.init();
    const ctx = synth.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'tab') {
      osc.type = 'square'; osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'click') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now); osc.stop(now + 0.03);
    } else if (type === 'success') {
      osc.type = 'square'; osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'delete') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  }
};

function App() {
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [isMuted,      setIsMuted]      = useState(false);
  const [dashboardData, setDashboardData] = useState({ summary: {}, players: [] });
  const [historyData,  setHistoryData]  = useState([]);
  const [isConnected,  setIsConnected]  = useState(false);

  // ── Subskrybujemy Firebase real-time ──────────────────
  // Kiedy dane się zmienią (ktokolwiek je zmieni), React
  // automatycznie odświeży widok — nie potrzebujemy refreshData()
  useEffect(() => {
    const unsubscribe = subscribeToData((data) => {
      setDashboardData({ summary: data.summary, players: data.players });
      setHistoryData(data.history || []);
      setIsConnected(true);
    });
    // Posprzątaj listener przy odmontowaniu komponentu
    return () => unsubscribe();
  }, []);

  const playSound = (type) => synth.play(type, isMuted);

  const switchTab = (tabId) => {
    playSound('tab');
    setActiveTab(tabId);
  };

  // refreshData jest już niepotrzebne (Firebase samo odświeża),
  // ale zostawiamy pustą funkcję żeby komponenty nie krzyczały błędów
  const refreshData = () => {};

  return (
    <div className="min-h-screen p-4 md:p-8 relative z-10">
      <div className="max-w-7xl mx-auto relative">

        <Header isMuted={isMuted} setIsMuted={setIsMuted} isConnected={isConnected} />

        <Navigation activeTab={activeTab} setActiveTab={switchTab} />

        <main>
          {activeTab === 'dashboard'  && <DashboardTab  data={dashboardData} history={historyData} refreshData={refreshData} playSound={playSound} />}
          {activeTab === 'attendance' && <AttendanceTab players={dashboardData.players} history={historyData} summary={dashboardData.summary} />}
          {activeTab === 'admin'      && <AdminTab      players={dashboardData.players} refreshData={refreshData} setActiveTab={switchTab} playSound={playSound} />}
          {activeTab === 'history'    && <HistoryTab    history={historyData} />}
          {activeTab === 'players'    && <PlayersTab    players={dashboardData.players} refreshData={refreshData} playSound={playSound} />}
        </main>

      </div>
    </div>
  );
}

export default App;
