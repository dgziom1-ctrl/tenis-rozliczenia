import { LayoutDashboard, PlusCircle, History, Users, Trophy } from 'lucide-react';

const tabs = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Command', shortLabel: 'CMD'     },
  { id: 'attendance', icon: Trophy,           label: 'Ranking',  shortLabel: 'RANK'   },
  { id: 'admin',      icon: PlusCircle,       label: 'Log',      shortLabel: 'LOG'    },
  { id: 'history',    icon: History,          label: 'Archive',  shortLabel: 'ARCH'   },
  { id: 'players',    icon: Users,            label: 'Agents',   shortLabel: 'AGT'    },
];

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
              aria-pressed={activeTab === tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`desktop-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <tab.icon size={14} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
                {tab.id === 'admin' && activeTab !== tab.id && (
                  <span style={{
                    position: 'absolute', top: -3, right: -4,
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--cyber-yellow)',
                    boxShadow: '0 0 6px var(--cyber-yellow)',
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
              <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              {tab.id === 'admin' && activeTab !== tab.id && (
                <span style={{
                  position: 'absolute', top: -3, right: -4,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--cyber-yellow)',
                  boxShadow: '0 0 6px var(--cyber-yellow)',
                }} />
              )}
            </span>
            <span className="mobile-nav-label">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
