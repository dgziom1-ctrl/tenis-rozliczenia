import { Volume2, VolumeX, Smartphone, Copy, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Header({ isMuted, setIsMuted, isConnected, scrolled }) {
  const [copied, setCopied] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti, setConfetti] = useState([]);

  const chaosTimer   = useRef(null);
  const clickCount   = useRef(0);
  const clickTimer   = useRef(null);

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  useEffect(() => () => {
    clearTimeout(chaosTimer.current);
    clearTimeout(clickTimer.current);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 5-tap easter egg on PING-PONG label
  const handlePingPongClick = () => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      activateChaos();
    } else {
      clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
    }
  };

  const activateChaos = () => {
    setChaosMode(true);
    const pool = ['🏓','⚡','🎱','🌀','🎉','✨','🏆','💫','🎮','🌟'];
    setConfetti(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      emoji: pool[Math.floor(Math.random() * pool.length)],
      x:     Math.random() * 100,
      delay: Math.random() * 1.2,
      dur:   1.8 + Math.random() * 1.5,
      size:  18 + Math.random() * 24,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => {
      setChaosMode(false);
      setConfetti([]);
    }, 4000);
  };

  const pSize  = 'clamp(24px,4vw,40px)';
  const pInner = 'clamp(12px,2.5vw,20px)';

  return (
    <>
      {/* CONFETTI BURST */}
      {chaosMode && confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{
            left: `${c.x}%`, top: 0,
            fontSize: `${c.size}px`,
            animation: `confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift': `${c.drift}px`,
            transform: `rotate(${c.rotate}deg)`,
          }}>
          {c.emoji}
        </div>
      ))}

      {/* CHAOS OVERLAY */}
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{
          zIndex: 49,
          animation: 'chaosFlash 0.6s ease-out forwards',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(129,140,248,0.1) 0%, transparent 70%)',
        }} />
      )}

      <header style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(to bottom, #080c18, #0d1220)',
        borderRadius: '0.75rem 0.75rem 0 0',
      }}>

        {/* Subtle indigo glow blobs */}
        <div className="absolute top-0 left-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(99,102,241,0.06)' }} />
        <div className="absolute top-8 right-1/4 w-32 h-32 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(124,58,237,0.05)' }} />

        {/* ══ TOP BAR: BLIK + MUTE ════════════════════════ */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>

          {/* BLIK */}
          <button onClick={handleCopy}
            className="group flex items-center gap-2 px-3 py-2 transition-all duration-200"
            style={{
              border: '1px solid rgba(148,163,184,0.12)',
              background: 'rgba(8,12,24,0.6)',
              borderRadius: '0.5rem',
            }}>
            <Smartphone size={16} style={{ color: '#64748b' }} />
            <span style={{
              fontWeight: 700, color: '#94a3b8',
              fontSize: '0.7rem', letterSpacing: '0.18em',
              padding: '2px 6px',
              background: 'rgba(148,163,184,0.06)',
              border: '1px solid rgba(148,163,184,0.1)',
              borderRadius: '0.3rem',
            }}>BLIK</span>
            <span style={{
              color: '#e2e8f0',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.9rem', fontWeight: 600,
              letterSpacing: '0.04em',
            }}>{blikNumber}</span>
            <div style={{ width: 1, height: 14, background: 'rgba(148,163,184,0.15)', margin: '0 2px' }} />
            {copied
              ? <Check size={14} style={{ color: '#86efac' }} />
              : <Copy  size={14} style={{ color: 'rgba(100,116,139,0.6)' }} />}
          </button>

          {/* Mute */}
          <button onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center w-9 h-9 transition-all duration-200"
            style={{
              border: isMuted
                ? '1px solid rgba(248,113,113,0.35)'
                : '1px solid rgba(148,163,184,0.15)',
              color:  isMuted ? '#f87171' : '#64748b',
              background: isMuted ? 'rgba(127,29,29,0.15)' : 'transparent',
              borderRadius: '0.5rem',
            }}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* ══ MAIN SECTION ═══════════════════════════════ */}
        <div className="relative z-10 px-4 py-5 flex flex-col items-center">

          {/* ASCII Pong */}
          <div className="ascii-pong-field mb-2">
            <span style={{ color: '#818cf8', fontSize: '1.5rem', fontWeight: 'bold' }}>「</span>
            <div className="ball-court mx-4">
              <span className="ascii-ball"
                style={{ fontSize: '1.25rem', color: '#a5b4fc' }}>●</span>
            </div>
            <span style={{ color: '#818cf8', fontSize: '1.5rem', fontWeight: 'bold' }}>」</span>
          </div>

          {/* Title */}
          <h1 className="text-center mb-4 w-full">
            <span className="block uppercase" style={{
              fontSize: 'clamp(1.4rem, 4.5vw, 2.4rem)',
              letterSpacing: '0.06em',
              fontWeight: 800,
              lineHeight: 1.15,
              backgroundImage: 'linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #e2e8f0 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '0.75rem',
            }}>
              CENTRUM DOWODZENIA
            </span>

            {/* PING-PONG + paddles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px,2vw,16px)', marginTop: '0.5rem', flexWrap: 'nowrap' }}>

              {/* Left paddle */}
              <div style={{
                position: 'relative', flexShrink: 0,
                transform: chaosMode ? 'rotate(720deg) scale(1.5)' : 'rotate(-45deg)',
                transition: 'transform 0.5s',
              }}>
                <div style={{ width: pSize, height: pSize, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: pInner, height: pInner, borderRadius: '50%', background: '#a78bfa' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 'clamp(-10px,-1.8vw,-14px)', left: '50%',
                  transform: 'translateX(-50%)', width: 'clamp(6px,1vw,8px)', height: 'clamp(12px,2vw,20px)',
                  background: 'linear-gradient(to bottom,#475569,#334155)',
                  borderRadius: '0 0 4px 4px' }} />
              </div>

              {/* PING-PONG label — 5-tap easter egg */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={handlePingPongClick}
                  aria-label="Ping Pong"
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <span className="block font-black whitespace-nowrap" style={{
                    fontSize: 'clamp(2rem, 7vw, 4rem)',
                    letterSpacing: '0.1em',
                    lineHeight: 1.2,
                    transition: 'all 0.3s',
                    ...(chaosMode ? { color: '#a5b4fc', animation: 'headerBounce 0.4s ease-in-out 3' } : {
                      backgroundImage: 'linear-gradient(135deg, #c084fc, #818cf8, #a5b4fc)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }),
                  }}>
                    PING-PONG
                  </span>
                </button>

                {/* Subtle hint */}
                {!chaosMode && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '0.6rem',
                    color: 'rgba(129,140,248,0.4)',
                    letterSpacing: '0.12em',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}>
                    ✦ ponk ponk ponk ✦
                  </div>
                )}

                {chaosMode && (
                  <div style={{
                    position: 'absolute', bottom: '-32px', left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', fontWeight: 900,
                    padding: '3px 16px',
                    border: '1px solid rgba(129,140,248,0.3)',
                    background: 'rgba(13,18,32,0.96)',
                    color: '#a5b4fc',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                  }}>✦ combo ×5</div>
                )}
              </div>

              {/* Right paddle */}
              <div style={{
                position: 'relative', flexShrink: 0,
                transform: chaosMode ? 'rotate(-720deg) scale(1.5)' : 'rotate(45deg)',
                transition: 'transform 0.5s',
              }}>
                <div style={{ width: pSize, height: pSize, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: pInner, height: pInner, borderRadius: '50%', background: '#818cf8' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 'clamp(-10px,-1.8vw,-14px)', left: '50%',
                  transform: 'translateX(-50%)', width: 'clamp(6px,1vw,8px)', height: 'clamp(12px,2vw,20px)',
                  background: 'linear-gradient(to bottom,#475569,#334155)',
                  borderRadius: '0 0 4px 4px' }} />
              </div>
            </div>
          </h1>

          {/* Thin indigo loader bar */}
          <div style={{
            width: '100%', maxWidth: '28rem', height: '2px',
            background: '#1e2436', borderRadius: '9999px',
            overflow: 'hidden', marginTop: '1.25rem', marginBottom: '0.75rem',
          }}>
            <div style={{
              height: '100%', width: '100%',
              background: chaosMode
                ? 'linear-gradient(90deg,#c084fc,#818cf8,#6366f1)'
                : 'linear-gradient(90deg,#6366f1,#818cf8,#a5b4fc)',
              borderRadius: '9999px',
            }} />
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
            <span style={{
              fontSize: '0.72rem', color: 'rgba(129,140,248,0.45)',
              letterSpacing: '0.12em', fontWeight: 500,
            }}>PING · PONG</span>
            <span style={{ color: 'rgba(148,163,184,0.2)', fontSize: '0.8rem' }}>│</span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em',
              color: isConnected ? '#86efac' : '#f87171',
            }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Separator */}
      <div style={{
        height: '1rem',
        background: 'linear-gradient(to bottom,#0d1220,#080c18)',
        borderBottom: '1px solid rgba(148,163,184,0.06)',
      }}>
        <div style={{ height: '1px', background: 'linear-gradient(90deg,transparent,rgba(129,140,248,0.2) 50%,transparent)' }} />
      </div>

      {/* Compact sticky header (mobile) */}
      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy}
          style={{ background: 'transparent', border: 'none', padding: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Smartphone size={15} style={{ color: '#64748b', flexShrink: 0 }} />
          <span style={{
            fontWeight: 700, color: '#94a3b8', fontSize: '0.6rem',
            letterSpacing: '0.12em', padding: '2px 5px',
            background: 'rgba(148,163,184,0.06)',
            border: '1px solid rgba(148,163,184,0.1)',
            borderRadius: '3px',
          }}>BLIK</span>
          <span style={{
            color: '#e2e8f0', fontWeight: 600,
            fontSize: '0.9rem', letterSpacing: '0.06em',
          }}>{blikNumber}</span>
          {copied
            ? <Check size={13} style={{ color: '#86efac' }} />
            : <Copy  size={13} style={{ color: 'rgba(100,116,139,0.5)', opacity: 0.7 }} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.6rem', fontWeight: 600,
            color: isConnected ? '#86efac' : '#f87171',
          }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
          <button onClick={() => setIsMuted(!isMuted)} style={{
            border: isMuted ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(148,163,184,0.15)',
            color: isMuted ? '#f87171' : '#64748b',
            background: 'transparent',
            borderRadius: '0.4rem', padding: '4px 6px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </>
  );
}
