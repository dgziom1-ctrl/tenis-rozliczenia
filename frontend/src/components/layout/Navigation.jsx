import { LayoutDashboard, Settings, History, Users, Trophy, Gamepad2, Zap } from 'lucide-react';

const tabs = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { id: 'attendance', icon: Trophy,           label: 'Frekwencja' },
  { id: 'admin',      icon: Settings,         label: 'Sesja'      },
  { id: 'history',    icon: History,          label: 'Historia'   },
  { id: 'players',    icon: Users,            label: 'Gracze'     },
];

export default function Navigation({ activeTab, setActiveTab, theme, onToggleTheme }) {
  const a = theme === 'arcade';

  return (
    <>
      <style>{`
        @keyframes pixelPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(57,255,20,0.7); }
          50%       { box-shadow: 0 0 0 3px rgba(57,255,20,0); }
        }
        @keyframes cyberPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(6,182,212,0.4); }
          50%       { box-shadow: 0 0 22px rgba(6,182,212,0.7); }
        }

        /* ── Desktop nav ── */
        .desktop-nav {
          display: none;
        }

        /* ── Mobile bottom bar ── */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 40;
          display: flex;
          align-items: stretch;
          padding: 0;
          border-top: 2px solid;
          border-color: ${a ? '#1a4d00' : 'rgb(22,78,99)'};
          background: ${a ? '#010300' : '#080c14'};
          /* Push content above home indicator */
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .mobile-nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 4px 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          background: transparent;
          position: relative;
          overflow: hidden;
        }

        .mobile-nav-btn.active::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: ${a ? '#39ff14' : 'rgb(34,211,238)'};
          box-shadow: 0 0 8px ${a ? 'rgba(57,255,20,0.8)' : 'rgba(34,211,238,0.8)'};
        }

        .mobile-nav-btn.active {
          color: ${a ? '#39ff14' : 'rgb(103,232,249)'};
          background: ${a ? 'rgba(57,255,20,0.06)' : 'rgba(6,182,212,0.08)'};
          animation: ${a ? 'pixelPulse' : 'cyberPulse'} 2s ease-in-out infinite;
        }

        .mobile-nav-btn:not(.active) {
          color: ${a ? '#176604' : 'rgb(22,78,99)'};
        }

        .mobile-nav-btn:not(.active):active {
          background: ${a ? 'rgba(57,255,20,0.04)' : 'rgba(6,182,212,0.04)'};
        }

        .mobile-nav-label {
          font-size: ${a ? '0.42rem' : '0.6rem'};
          font-weight: bold;
          letter-spacing: ${a ? '0.04em' : '0.05em'};
          font-family: ${a ? "'Press Start 2P', monospace" : 'inherit'};
          line-height: 1;
        }

        .theme-toggle-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: ${a ? '0' : '9999px'};
          border: 2px solid ${a ? '#cc4400' : 'rgb(126,34,206)'};
          color: ${a ? '#ff6b00' : 'rgb(192,132,252)'};
          background: ${a ? '#0d0200' : 'rgba(88,28,135,0.2)'};
          font-weight: bold;
          font-size: ${a ? '0.42rem' : '0.7rem'};
          font-family: ${a ? "'Press Start 2P', monospace" : 'inherit'};
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .theme-toggle-pill:hover {
          background: ${a ? '#ff6b00' : 'rgb(168,85,247)'};
          color: ${a ? '#010300' : 'black'};
        }

        /* ── Tablet/Desktop: show classic nav, hide mobile ── */
        @media (min-width: 640px) {
          .desktop-nav { display: block; }
          .mobile-nav  { display: none; }
        }
      `}</style>

      {/* ── DESKTOP NAV ─────────────────────────────────────── */}
      <div className="desktop-nav" style={{
        padding: '0.75rem',
        marginBottom: '2.5rem',
        background: a ? '#020500' : 'rgb(17,24,39)',
        border: a ? '2px solid #1a4d00' : '2px solid rgb(22,78,99)',
        borderRadius: a ? 0 : '0 0 1rem 1rem',
      }}>
        {/* Dashboard – full width */}
        <DesktopTab id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} a={a}>
          <LayoutDashboard size={18} />
          {a ? tabs[0].label.toUpperCase() : tabs[0].label}
        </DesktopTab>

        {/* 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {tabs.slice(1).map(tab => (
            <DesktopTab key={tab.id} id={tab.id} activeTab={activeTab} setActiveTab={setActiveTab} a={a}>
              <tab.icon size={16} />
              {a ? tab.label.toUpperCase() : tab.label}
            </DesktopTab>
          ))}
        </div>
      </div>

      {/* ── MOBILE BOTTOM BAR ───────────────────────────────── */}
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
            <span className="mobile-nav-label">{a ? tab.label.toUpperCase() : tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

function DesktopTab({ id, activeTab, setActiveTab, a, children }) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      aria-pressed={isActive}
      style={{
        width: '100%',
        marginBottom: '0.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.75rem',
        fontWeight: 'bold',
        fontSize: a ? '0.6rem' : '0.875rem',
        fontFamily: a ? "'Press Start 2P', monospace" : 'inherit',
        letterSpacing: a ? '0.05em' : 'normal',
        border: '2px solid',
        borderRadius: a ? 0 : '0.75rem',
        transition: 'all 0.2s',
        cursor: 'pointer',
        ...(isActive
          ? a
            ? { background: '#0a2200', borderColor: '#39ff14', color: '#39ff14', animation: 'pixelPulse 1.5s ease-in-out infinite' }
            : { background: 'rgb(8,47,73)', borderColor: 'rgb(34,211,238)', color: 'rgb(103,232,249)', animation: 'cyberPulse 2s ease-in-out infinite' }
          : a
            ? { background: 'transparent', borderColor: '#0d2900', color: '#176604' }
            : { background: 'rgba(0,0,0,0.4)', borderColor: 'transparent', color: 'rgb(22,78,99)' }
        ),
      }}
    >
      {children}
    </button>
  );
}
