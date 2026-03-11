import { LayoutDashboard, PlusCircle, History, Users, Trophy } from 'lucide-react';

const tabs = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Home',    shortLabel: 'Home'    },
  { id: 'attendance', icon: Trophy,           label: 'Ranking', shortLabel: 'Ranking' },
  { id: 'admin',      icon: PlusCircle,       label: 'Dodaj',   shortLabel: 'Dodaj'   },
  { id: 'history',    icon: History,          label: 'Historia',shortLabel: 'Historia'},
  { id: 'players',    icon: Users,            label: 'Gracze',  shortLabel: 'Gracze'  },
];

/**
 * Tab navigation — all styles live in index.css, themed via [data-theme] attribute on <html>.
 */
export default function Navigation({ activeTab, setActiveTab }) {
  return (
    <>
      {/* ── Desktop horizontal tab bar ─────────────────── */}
      <nav className="desktop-nav" role="navigation" aria-label="Nawigacja główna">
        <div className="desktop-nav-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`desktop-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Mobile bottom bar ──────────────────────────── */}
      <nav className="mobile-nav" role="navigation" aria-label="Nawigacja główna">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`mobile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={21} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
            <span className="mobile-nav-label">{tab.shortLabel.toUpperCase()}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
