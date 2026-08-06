import { LayoutDashboard, PlusCircle, History, Users, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabId } from '@/types/ui';

interface Tab {
  id: TabId;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
}

const tabs: Tab[] = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Home',     shortLabel: 'HOME'    },
  { id: 'attendance', icon: Trophy,           label: 'Ranking',  shortLabel: 'RANKING' },
  { id: 'admin',      icon: PlusCircle,       label: 'Dodaj',    shortLabel: 'DODAJ'   },
  { id: 'history',    icon: History,          label: 'Historia', shortLabel: 'HISTORIA'},
  { id: 'players',    icon: Users,            label: 'Gracze',   shortLabel: 'GRACZE'  },
];

interface NavigationProps {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
}

export default function Navigation({ activeTab, setActiveTab }: NavigationProps) {
  return (
    <>
      <nav className="desktop-nav" role="navigation" aria-label="Nawigacja główna">
        <div className="desktop-nav-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`desktop-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={13} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      <nav className="mobile-nav" role="navigation" aria-label="Nawigacja główna">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`mobile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
            <span className="mobile-nav-label">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
