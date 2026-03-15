import { LayoutDashboard, PlusCircle, History, Users, Trophy } from 'lucide-react';

const tabs = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Home'    },
  { id: 'attendance', icon: Trophy,           label: 'Ranking' },
  { id: 'admin',      icon: PlusCircle,       label: 'Dodaj'   },
  { id: 'history',    icon: History,          label: 'Historia'},
  { id: 'players',    icon: Users,            label: 'Gracze'  },
];

const ACCENT = 'rgba(255,255,255,0.7)';
const DOT_COLOR = 'rgba(0,200,83,0.9)';

export default function Navigation({ activeTab, setActiveTab }) {
  return (
    <>
      {/* ── Desktop ── */}
      <nav className="desktop-nav" role="navigation" aria-label="Nawigacja główna">
        <div className="desktop-nav-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`desktop-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
                {tab.id === 'admin' && activeTab !== tab.id && (
                  <span style={{
                    position: 'absolute', top: -3, right: -4,
                    width: 7, height: 7, borderRadius: '50%',
                    background: DOT_COLOR,
                    boxShadow: '0 0 5px rgba(0,200,83,0.8)',
                  }} />
                )}
              </span>
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Mobile ── */}
      <nav className="mobile-nav" role="navigation" aria-label="Nawigacja główna">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`mobile-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <tab.icon size={21} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              {tab.id === 'admin' && activeTab !== tab.id && (
                <span style={{
                  position: 'absolute', top: -3, right: -4,
                  width: 7, height: 7, borderRadius: '50%',
                  background: DOT_COLOR,
                  boxShadow: '0 0 5px rgba(0,200,83,0.8)',
                }} />
              )}
            </span>
            <span className="mobile-nav-label">{tab.label.toUpperCase()}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
