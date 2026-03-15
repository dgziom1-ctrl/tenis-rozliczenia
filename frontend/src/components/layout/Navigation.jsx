import { LayoutDashboard, PlusCircle, History, Users, Trophy } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const theme = useTheme();
  const accentDot = theme === 'arcade' ? '#39ff14' : theme === 'zen' ? '#2d6a4f' : '#22d3ee';
  const accentGlow = theme === 'arcade'
    ? '0 0 6px rgba(57,255,20,0.9)'
    : theme === 'zen'
    ? 'none'
    : '0 0 6px rgba(34,211,238,0.8)';

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
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
                {tab.id === 'admin' && activeTab !== tab.id && (
                  <span style={{
                    position: 'absolute', top: -3, right: -4,
                    width: 7, height: 7, borderRadius: '50%',
                    background: accentDot,
                    boxShadow: accentGlow,
                  }} />
                )}
              </span>
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
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <tab.icon size={21} strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              {tab.id === 'admin' && activeTab !== tab.id && (
                <span style={{
                  position: 'absolute', top: -3, right: -4,
                  width: 7, height: 7, borderRadius: '50%',
                  background: accentDot,
                  boxShadow: accentGlow,
                }} />
              )}
            </span>
            <span className="mobile-nav-label">{tab.shortLabel.toUpperCase()}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
