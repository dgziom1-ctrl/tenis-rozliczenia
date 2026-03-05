import { LayoutDashboard, PlusCircle, History, Users, Trophy } from 'lucide-react';

const tabs = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Home', shortLabel: 'Home'    },
  { id: 'attendance', icon: Trophy,           label: 'Ranking', shortLabel: 'Ranking'  },
  { id: 'admin',      icon: PlusCircle,         label: 'Dodaj',shortLabel: 'Dodaj'    },
  { id: 'history',    icon: History,          label: 'Hist.',   shortLabel: 'Hist.'    },
  { id: 'players',    icon: Users,            label: 'Gracze',     shortLabel: 'Gracze'   },
];

export default function Navigation({ activeTab, setActiveTab, theme }) {
  const a = theme === 'arcade';
  const z = theme === 'zen';

  return (
    <>
      <style>{`
        /* ── Animations ── */
        @keyframes pixelPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(57,255,20,0.6); }
          50%       { box-shadow: 0 0 0 4px rgba(57,255,20,0); }
        }
        @keyframes cyberPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(6,182,212,0.3); }
          50%       { box-shadow: 0 0 20px rgba(6,182,212,0.6); }
        }
        @keyframes zenPulse {
          0%, 100% { box-shadow: 0 2px 10px rgba(45,106,79,0.15); }
          50%       { box-shadow: 0 3px 18px rgba(45,106,79,0.3); }
        }

        /* ── Desktop horizontal tab bar ── */
        .desktop-nav {
          display: none;
        }

        .desktop-nav-inner {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px;
          background: ${a ? '#020500' : z ? '#ede8df' : 'rgb(17,24,39)'};
          border: 2px solid ${a ? '#1a4d00' : z ? '#c2b49a' : 'rgb(22,78,99)'};
          border-radius: ${a ? '0' : z ? '0 0 1.25rem 1.25rem' : '0 0 1rem 1rem'};
          margin-bottom: 2.5rem;
          ${z ? 'box-shadow: 0 4px 16px rgba(61,48,37,0.08);' : ''}
        }

        .desktop-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 8px;
          font-weight: bold;
          font-size: ${a ? '0.55rem' : z ? '0.78rem' : '0.82rem'};
          font-family: ${a ? "'Press Start 2P', monospace" : z ? "'Cinzel', serif" : 'inherit'};
          letter-spacing: ${a ? '0.04em' : z ? '0.06em' : '0.02em'};
          border: 2px solid transparent;
          border-radius: ${a ? '0' : z ? '1rem' : '0.6rem'};
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .desktop-tab.active {
          background: ${a ? '#0a2200' : z ? 'rgba(45,106,79,0.1)' : 'rgb(8,47,73)'};
          border-color: ${a ? '#39ff14' : z ? '#2d6a4f' : 'rgb(34,211,238)'};
          color: ${a ? '#39ff14' : z ? '#2d6a4f' : 'rgb(103,232,249)'};
          animation: ${a ? 'pixelPulse 1.8s ease-in-out infinite' : z ? 'zenPulse 2.5s ease-in-out infinite' : 'cyberPulse 2s ease-in-out infinite'};
        }

        .desktop-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0; left: 10%; right: 10%;
          height: 2px;
          background: ${a ? '#39ff14' : z ? '#2d6a4f' : 'rgb(34,211,238)'};
          box-shadow: 0 0 6px ${a ? 'rgba(57,255,20,0.8)' : z ? 'rgba(45,106,79,0.5)' : 'rgba(34,211,238,0.8)'};
          border-radius: 2px 2px 0 0;
        }

        .desktop-tab:not(.active) {
          background: transparent;
          border-color: transparent;
          color: ${a ? '#176604' : z ? '#9aaa9a' : 'rgb(51,65,85)'};
        }

        .desktop-tab:not(.active):hover {
          background: ${a ? 'rgba(57,255,20,0.05)' : z ? 'rgba(45,106,79,0.07)' : 'rgba(6,182,212,0.07)'};
          border-color: ${a ? '#1a4d00' : z ? 'rgba(45,106,79,0.35)' : 'rgba(22,78,99,0.5)'};
          color: ${a ? '#28cc0e' : z ? '#2d6a4f' : 'rgb(103,232,249)'};
        }

        /* ── Mobile bottom bar ── */
        .mobile-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 40;
          display: flex;
          align-items: stretch;
          border-top: 2px solid ${a ? '#1a4d00' : z ? 'rgba(45,106,79,0.3)' : 'rgb(22,78,99)'};
          background: ${a ? 'rgba(1,3,0,0.97)' : z ? 'rgba(232,237,232,0.97)' : 'rgba(8,12,20,0.97)'};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          ${z ? 'box-shadow: 0 -2px 12px rgba(61,48,37,0.1);' : ''}
        }

        .mobile-nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 10px 4px 8px;
          min-height: 56px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          background: transparent;
          position: relative;
          overflow: hidden;
        }

        .mobile-nav-btn::before {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%;
          height: 2px;
          background: transparent;
          transition: background 0.15s, box-shadow 0.15s;
          border-radius: 0 0 2px 2px;
        }

        .mobile-nav-btn.active::before {
          background: ${a ? '#39ff14' : z ? '#2d6a4f' : 'rgb(34,211,238)'};
          box-shadow: 0 0 8px ${a ? 'rgba(57,255,20,0.9)' : z ? 'rgba(45,106,79,0.6)' : 'rgba(34,211,238,0.9)'};
        }

        .mobile-nav-btn.active {
          color: ${a ? '#39ff14' : z ? '#2d6a4f' : 'rgb(103,232,249)'};
          background: ${a ? 'rgba(57,255,20,0.05)' : z ? 'rgba(45,106,79,0.08)' : 'rgba(6,182,212,0.07)'};
        }

        .mobile-nav-btn:not(.active) {
          color: ${a ? '#176604' : z ? '#9aaa9a' : 'rgb(51,65,85)'};
        }

        .mobile-nav-btn:active {
          background: ${a ? 'rgba(57,255,20,0.1)' : z ? 'rgba(45,106,79,0.12)' : 'rgba(6,182,212,0.1)'};
        }

        .mobile-nav-label {
          font-size: ${a ? '0.38rem' : z ? '0.5rem' : '0.58rem'};
          font-weight: bold;
          letter-spacing: ${a ? '0.03em' : z ? '0.07em' : '0.04em'};
          font-family: ${a ? "'Press Start 2P', monospace" : z ? "'Cinzel', serif" : 'inherit'};
          line-height: 1;
          margin-top: 1px;
        }

        /* ── Responsive breakpoint ── */
        @media (min-width: 640px) {
          .desktop-nav { display: block; }
          .mobile-nav  { display: none; }
        }
      `}</style>

      {/* ── DESKTOP — horizontal tab bar ─────────────────────── */}
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
              {a ? tab.label.toUpperCase() : tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MOBILE — bottom bar ──────────────────────────────── */}
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
            <span className="mobile-nav-label">{tab.shortLabel}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
