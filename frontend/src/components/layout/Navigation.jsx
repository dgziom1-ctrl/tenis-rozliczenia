import { LayoutDashboard, Settings, History, Users, Trophy } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'attendance', icon: Trophy, label: 'Frekwencja' },
    { id: 'admin', icon: Settings, label: 'Panel Admina' },
    { id: 'history', icon: History, label: 'Historia' },
    { id: 'players', icon: Users, label: 'Gracze' }
  ];

  return (
    <div className="cyber-box p-4 rounded-b-2xl flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          /* Changed classes: larger padding (px-6, py-4), flexibility on mobile (flex-1) */
          className={`flex items-center justify-center gap-3 px-6 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base transition-all duration-200 border-2 flex-1 sm:flex-none min-w-[140px] ${
            activeTab === tab.id 
              ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_15px_#00f3ff]' 
              : 'bg-black/40 border-transparent text-cyan-800 hover:border-cyan-700 hover:text-cyan-500 hover:bg-black/60'
          }`}
        >
          <tab.icon size={22} /> {tab.label}
        </button>
      ))}
    </div>
  );
}