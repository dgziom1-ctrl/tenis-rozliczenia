import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import DashboardTab from './components/dashboard/DashboardTab';
import AttendanceTab from './components/attendance/AttendanceTab';
import AdminTab from './components/admin/AdminTab';
import HistoryTab from './components/history/HistoryTab';
import PlayersTab from './components/players/PlayersTab';
import PongGame from './components/easter/PongGame';
import { subscribeToData } from './firebase';

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
      osc.frequency.setValueAtTime(880,    now + 0.3);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'delete') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'coin') {
      // INSERT COIN sound — two-tone beep
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
  }
};

function App() {
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [isMuted,     setIsMuted]     = useState(false);
  const [pongOpen,    setPongOpen]    = useState(false);
  const [theme,       setTheme]       = useState(() => {
    try { return localStorage.getItem('ponk-theme') || 'cyber'; } catch { return 'cyber'; }
  });
  const [appData, setAppData] = useState({
    summary: {}, players: [], playerNames: [],
    defaultMultiPlayers: [], deletedPlayers: [], history: [],
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsub = subscribeToData((data) => { setAppData(data); setIsConnected(true); });
    return () => unsub();
  }, []);

  // Easter egg — wpisz "ponk"
  useEffect(() => {
    const SECRET = 'ponk';
    let buf = '';
    const h = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      buf = (buf + e.key.toLowerCase()).slice(-SECRET.length);
      if (buf === SECRET) { setPongOpen(true); buf = ''; }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'cyber' ? 'arcade' : 'cyber';
    setTheme(next);
    try { localStorage.setItem('ponk-theme', next); } catch {}
    synth.play('coin', isMuted);
  };

  const playSound   = (t) => synth.play(t, isMuted);
  const switchTab   = (id) => { playSound('tab'); setActiveTab(id); };
  const refreshData = () => {};

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
          {activeTab === 'dashboard'  && <DashboardTab  data={{ summary: appData.summary, players: appData.players }} history={appData.history}  refreshData={refreshData} playSound={playSound} />}
          {activeTab === 'attendance' && <AttendanceTab players={appData.players} history={appData.history} summary={appData.summary} />}
          {activeTab === 'admin'      && <AdminTab      playerNames={appData.playerNames} defaultMultiPlayers={appData.defaultMultiPlayers} refreshData={refreshData} setActiveTab={switchTab} playSound={playSound} />}
          {activeTab === 'history'    && <HistoryTab    history={appData.history} playerNames={appData.playerNames} playSound={playSound} />}
          {activeTab === 'players'    && <PlayersTab    players={appData.players} deletedPlayers={appData.deletedPlayers} refreshData={refreshData} playSound={playSound} />}
        </main>
        {pongOpen && <PongGame onClose={() => setPongOpen(false)} />}
      </div>
    </div>
  );
}

export default App;
