import { LayoutDashboard, Settings, History, Users, Trophy, Gamepad2, Zap } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, theme, onToggleTheme }) {
  const tabs = [
    { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',    arcade: 'DASHBOARD'  },
    { id: 'attendance', icon: Trophy,           label: 'Frekwencja',   arcade: 'FREKWENCJA' },
    { id: 'admin',      icon: Settings,         label: 'Panel Admina', arcade: 'PANEL ADM.' },
    { id: 'history',    icon: History,          label: 'Historia',     arcade: 'HISTORIA'   },
    { id: 'players',    icon: Users,            label: 'Gracze',       arcade: 'GRACZE'     },
  ];

  const isArcade = theme === 'arcade';

  return (
    <>
      <style>{`
        @keyframes pixelPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(57,255,20,0.7), inset 0 0 8px rgba(57,255,20,0.1); }
          50%       { box-shadow: 0 0 0 3px rgba(57,255,20,0), inset 0 0 14px rgba(57,255,20,0.2); }
        }
        @keyframes cyberPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(6,182,212,0.5); }
          50%       { box-shadow: 0 0 25px rgba(6,182,212,0.8); }
        }
      `}</style>

      <div style={{
        padding: '0.75rem',
        marginBottom: '2.5rem',
        background: isArcade ? '#020500' : 'rgb(17,24,39)',
        border: isArcade ? '2px solid #1a4d00' : '2px solid rgb(22,78,99)',
        borderRadius: isArcade ? 0 : '0 0 1rem 1rem',
      }}>

        {/* Dashboard — full width */}
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            width: '100%',
            marginBottom: '0.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.75rem',
            fontWeight: 'bold',
            fontSize: isArcade ? '0.6rem' : '0.875rem',
            fontFamily: isArcade ? "'Press Start 2P', monospace" : 'inherit',
            letterSpacing: isArcade ? '0.05em' : 'normal',
            border: '2px solid',
            borderRadius: isArcade ? 0 : '0.75rem',
            transition: 'all 0.2s',
            cursor: 'pointer',
            ...(activeTab === 'dashboard'
              ? isArcade
                ? { background: '#0a2200', borderColor: '#39ff14', color: '#39ff14',
                    animation: 'pixelPulse 1.5s ease-in-out infinite' }
                : { background: 'rgb(8,47,73)', borderColor: 'rgb(34,211,238)', color: 'rgb(103,232,249)',
                    animation: 'cyberPulse 2s ease-in-out infinite' }
              : isArcade
                ? { background: 'transparent', borderColor: '#0d2900', color: '#176604' }
                : { background: 'rgba(0,0,0,0.4)', borderColor: 'transparent', color: 'rgb(22,78,99)' }
            ),
          }}
        >
          <LayoutDashboard size={20} />
          {isArcade ? 'DASHBOARD' : 'Dashboard'}
        </button>

        {/* 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {tabs.slice(1).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.75rem 0.4rem',
                fontWeight: 'bold',
                fontSize: isArcade ? '0.55rem' : '0.875rem',
                fontFamily: isArcade ? "'Press Start 2P', monospace" : 'inherit',
                letterSpacing: isArcade ? '0.02em' : 'normal',
                border: '2px solid',
                borderRadius: isArcade ? 0 : '0.75rem',
                transition: 'all 0.2s',
                cursor: 'pointer',
                ...(activeTab === tab.id
                  ? isArcade
                    ? { background: '#0a2200', borderColor: '#39ff14', color: '#39ff14',
                        animation: 'pixelPulse 1.5s ease-in-out infinite' }
                    : { background: 'rgb(8,47,73)', borderColor: 'rgb(34,211,238)', color: 'rgb(103,232,249)',
                        animation: 'cyberPulse 2s ease-in-out infinite' }
                  : isArcade
                    ? { background: 'transparent', borderColor: '#0d2900', color: '#176604' }
                    : { background: 'rgba(0,0,0,0.4)', borderColor: 'transparent', color: 'rgb(22,78,99)' }
                ),
              }}
            >
              <tab.icon size={16} />
              {isArcade ? tab.arcade : tab.label}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            padding: '0.6rem',
            fontWeight: 'bold',
            fontSize: isArcade ? '0.5rem' : '0.75rem',
            fontFamily: isArcade ? "'Press Start 2P', monospace" : 'inherit',
            letterSpacing: isArcade ? '0.04em' : 'normal',
            border: '2px solid',
            borderRadius: isArcade ? 0 : '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderColor: isArcade ? '#cc4400' : 'rgb(126,34,206)',
            color: isArcade ? '#ff6b00' : 'rgb(192,132,252)',
            background: isArcade ? '#0d0200' : 'rgba(88,28,135,0.2)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isArcade ? '#ff6b00' : 'rgb(168,85,247)';
            e.currentTarget.style.color = isArcade ? '#010300' : 'black';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isArcade ? '#0d0200' : 'rgba(88,28,135,0.2)';
            e.currentTarget.style.color = isArcade ? '#ff6b00' : 'rgb(192,132,252)';
          }}
        >
          {isArcade ? (
            <><Zap size={12} /> SWITCH: CYBER PONK <Zap size={12} /></>
          ) : (
            <><Gamepad2 size={14} /> Switch → Retro Arcade <Gamepad2 size={14} /></>
          )}
        </button>
      </div>
    </>
  );
}
