import { LayoutDashboard, Settings, History, Users, Trophy } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard'    },
    { id: 'attendance', icon: Trophy,           label: 'Frekwencja'   },
    { id: 'admin',      icon: Settings,         label: 'Panel Admina' },
    { id: 'history',    icon: History,          label: 'Historia'     },
    { id: 'players',    icon: Users,            label: 'Gracze'       },
  ];

  const btnBase = 'flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 border-2';
  const btnActive = 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_#00f3ff]';
  const btnInactive = 'bg-black/40 border-transparent text-cyan-800 hover:border-cyan-700 hover:text-cyan-500 hover:bg-black/60';

  return (
    <div className="cyber-box p-3 rounded-b-2xl mb-10">
      {/* Dashboard — pełna szerokość */}
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`w-full mb-2 ${btnBase} ${activeTab === 'dashboard' ? btnActive : btnInactive}`}
      >
        <LayoutDashboard size={20} /> Dashboard
      </button>

      {/* Pozostałe 4 — siatka 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {tabs.slice(1).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${btnBase} ${activeTab === tab.id ? btnActive : btnInactive}`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
