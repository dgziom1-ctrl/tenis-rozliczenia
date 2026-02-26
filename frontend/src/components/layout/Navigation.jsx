import { LayoutDashboard, Settings, History, Users, Trophy, Gamepad2, Zap } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, theme, onToggleTheme }) {
  const tabs = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard'    },
    { id: 'attendance', icon: Trophy,           label: 'Frekwencja'   },
    { id: 'admin',      icon: Settings,         label: 'Panel Admina' },
    { id: 'history',    icon: History,          label: 'Historia'     },
    { id: 'players',    icon: Users,            label: 'Gracze'       },
  ];

  const isArcade = theme === 'arcade';

  const btnBase     = 'flex items-center justify-center gap-2 py-3 font-bold text-sm transition-all duration-200 border-2';
  const btnActive   = isArcade
    ? 'bg-[#0a2200] border-[#39ff14] text-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.5)]'
    : 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_#00f3ff]';
  const btnInactive = isArcade
    ? 'bg-black/40 border-transparent text-[#176604] hover:border-[#39ff14] hover:text-[#39ff14]'
    : 'bg-black/40 border-transparent text-cyan-800 hover:border-cyan-700 hover:text-cyan-500 hover:bg-black/60';
  const boxClass    = isArcade
    ? 'p-3 mb-10 bg-[#020500] border-2 border-[#1a4d00]'
    : 'cyber-box p-3 rounded-b-2xl mb-10';

  const radius = isArcade ? '' : 'rounded-xl';

  return (
    <div className={boxClass}>
      {/* Dashboard — pełna szerokość */}
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`w-full mb-2 ${btnBase} ${radius} ${activeTab === 'dashboard' ? btnActive : btnInactive}`}
      >
        <LayoutDashboard size={20} />
        {isArcade ? 'DASH' : 'Dashboard'}
      </button>

      {/* Siatka 2x2 */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {tabs.slice(1).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${btnBase} ${radius} ${activeTab === tab.id ? btnActive : btnInactive}`}
          >
            <tab.icon size={18} />
            {isArcade
              ? tab.label.slice(0, 6).toUpperCase()
              : tab.label}
          </button>
        ))}
      </div>

      {/* ── PRZEŁĄCZNIK MOTYWU ─────────────────── */}
      <button
        onClick={onToggleTheme}
        className={`w-full flex items-center justify-center gap-3 py-2 border-2 font-bold text-xs transition-all duration-200 ${radius} ${
          isArcade
            ? 'border-[#ff6b00] text-[#ff6b00] bg-[#0d0200] hover:bg-[#ff6b00] hover:text-black hover:shadow-[0_0_15px_rgba(255,107,0,0.6)]'
            : 'border-purple-700 text-purple-400 bg-purple-950/30 hover:bg-purple-500 hover:text-black hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]'
        }`}
      >
        {isArcade ? (
          <>
            <Zap size={14} />
            SWITCH → CYBER PONK
            <Zap size={14} />
          </>
        ) : (
          <>
            <Gamepad2 size={14} />
            Switch → Retro Arcade
            <Gamepad2 size={14} />
          </>
        )}
      </button>
    </div>
  );
}
