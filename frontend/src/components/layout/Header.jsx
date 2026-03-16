import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Header({ isMuted, setIsMuted, isConnected, scrolled }) {
  const [copied, setCopied] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [tick, setTick] = useState(true);

  const chaosTimer = useRef(null);
  const clickCount  = useRef(0);
  const clickTimer  = useRef(null);
  const tickTimer   = useRef(null);

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  useEffect(() => {
    tickTimer.current = setInterval(() => setTick(p => !p), 800);
    return () => {
      clearInterval(tickTimer.current);
      clearTimeout(chaosTimer.current);
      clearTimeout(clickTimer.current);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    const pool = ['🏓','⚡','💀','🎮','💥','⚠️','🔥','🎯','💣','🌪️'];
    setConfetti(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      emoji: pool[Math.floor(Math.random() * pool.length)],
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      dur: 1.8 + Math.random() * 1.5,
      size: 18 + Math.random() * 24,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  return (
    <>
      {/* CONFETTI */}
      {chaosMode && confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{ left: `${c.x}%`, top: 0, fontSize: `${c.size}px`,
            animation: `confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift': `${c.drift}px`, transform: `rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 49,
          animation: 'chaosFlash 0.6s ease-out forwards',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(252,227,0,0.06) 0%, transparent 70%)' }} />
      )}

      {/* ── MAIN HEADER ── */}
      <header style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #080808 0%, #0d0d0d 100%)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        {/* Yellow corner accent lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 60, height: 2, background: 'var(--cyber-yellow)', boxShadow: '0 0 10px var(--cyber-yellow)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 2, background: 'var(--cyber-yellow)', boxShadow: '0 0 10px var(--cyber-yellow)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 40, background: 'linear-gradient(to bottom, var(--cyber-yellow), transparent)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 2, height: 40, background: 'linear-gradient(to bottom, var(--cyber-yellow), transparent)' }} />

        {/* Diagonal slash decoration */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: '48%', width: '2px', height: '100%',
            background: 'linear-gradient(to bottom, rgba(252,227,0,0.08), transparent)',
            transform: 'skewX(-20deg)',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: '52%', width: '1px', height: '100%',
            background: 'linear-gradient(to bottom, rgba(252,227,0,0.04), transparent)',
            transform: 'skewX(-20deg)',
          }} />
        </div>

        {/* ══ TOP BAR: BLIK + MUTE ══ */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 16px',
          borderBottom: '1px solid #141414' }}>

          {/* BLIK number */}
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#080808', border: '1px solid #2a2a2a',
            padding: '7px 12px', cursor: 'pointer',
            transition: 'all 0.18s',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            <Smartphone size={14} style={{ color: 'var(--cyber-text-dim)' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '0.18em', color: 'var(--cyber-yellow)',
              padding: '2px 6px', background: 'rgba(252,227,0,0.08)',
              border: '1px solid rgba(252,227,0,0.2)',
            }}>BLIK</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 400,
              letterSpacing: '0.06em', color: '#e0e0e0',
            }}>{blikNumber}</span>
            <div style={{ width: 1, height: 14, background: '#2a2a2a', margin: '0 2px' }} />
            {copied
              ? <Check size={13} style={{ color: 'var(--cyber-green)' }} />
              : <Copy  size={13} style={{ color: 'var(--cyber-text-dim)' }} />}
          </button>

          {/* Mute */}
          <button onClick={() => setIsMuted(!isMuted)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36,
            border: isMuted ? '1px solid rgba(255,0,51,0.5)' : '1px solid #2a2a2a',
            color: isMuted ? 'var(--cyber-red)' : 'var(--cyber-text-dim)',
            background: isMuted ? 'rgba(255,0,51,0.08)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.18s',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>

        {/* ══ MAIN SECTION ══ */}
        <div style={{ position: 'relative', zIndex: 10, padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to right, transparent, var(--cyber-yellow))' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 600,
              letterSpacing: '0.25em', color: 'var(--cyber-yellow)', textTransform: 'uppercase',
            }}>CENTRUM DOWODZENIA</span>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to left, transparent, var(--cyber-yellow))' }} />
          </div>

          {/* PING-PONG title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 3vw, 24px)' }}>
            {/* Left paddle */}
            <div style={{
              position: 'relative', flexShrink: 0,
              transform: chaosMode ? 'rotate(720deg) scale(1.5)' : 'rotate(-45deg)',
              transition: 'transform 0.5s',
            }}>
              <div style={{
                width: 'clamp(28px, 4.5vw, 44px)', height: 'clamp(28px, 4.5vw, 44px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                border: '2px solid var(--cyber-yellow)',
                boxShadow: '0 0 12px rgba(252,227,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: '55%', height: '55%', borderRadius: '50%', background: 'var(--cyber-yellow)', opacity: 0.9 }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 'clamp(-12px,-2vw,-16px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 'clamp(5px,1vw,7px)', height: 'clamp(14px,2.2vw,22px)',
                background: 'linear-gradient(to bottom, #555, #222)',
                borderRadius: '0 0 3px 3px',
              }} />
            </div>

            {/* PING-PONG label */}
            <button onClick={handlePingPongClick} aria-label="Ping Pong"
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(1.8rem, 7vw, 3.8rem)',
                letterSpacing: '0.06em',
                lineHeight: 1.1,
                ...(chaosMode ? {
                  color: 'var(--cyber-yellow)',
                  animation: 'headerBounce 0.4s ease-in-out 3',
                  textShadow: '0 0 30px var(--cyber-yellow)',
                } : {
                  color: 'var(--cyber-yellow)',
                  textShadow: '0 0 20px rgba(252,227,0,0.3), 2px 2px 0px rgba(0,0,0,0.8)',
                }),
              }}>
                PING-PONG
              </span>
            </button>

            {/* Right paddle */}
            <div style={{
              position: 'relative', flexShrink: 0,
              transform: chaosMode ? 'rotate(-720deg) scale(1.5)' : 'rotate(45deg)',
              transition: 'transform 0.5s',
            }}>
              <div style={{
                width: 'clamp(28px, 4.5vw, 44px)', height: 'clamp(28px, 4.5vw, 44px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                border: '2px solid var(--cyber-yellow)',
                boxShadow: '0 0 12px rgba(252,227,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: '55%', height: '55%', borderRadius: '50%', background: 'var(--cyber-yellow)', opacity: 0.9 }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 'clamp(-12px,-2vw,-16px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 'clamp(5px,1vw,7px)', height: 'clamp(14px,2.2vw,22px)',
                background: 'linear-gradient(to bottom, #555, #222)',
                borderRadius: '0 0 3px 3px',
              }} />
            </div>
          </div>

          {/* Divider line */}
          <div style={{
            width: '100%', maxWidth: '20rem', height: '1px', margin: '16px 0 12px',
            background: 'linear-gradient(90deg, transparent, var(--cyber-yellow) 50%, transparent)',
            opacity: 0.4,
          }} />

          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem', fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: tick ? 'var(--cyber-yellow)' : 'rgba(252,227,0,0.15)',
              textShadow: tick ? '0 0 10px var(--cyber-yellow)' : 'none',
              transition: 'color 0.15s, text-shadow 0.15s',
            }}>
              ⚡ JACK IN ⚡
            </span>
            <span style={{ color: '#1e1e1e', fontSize: '0.7rem' }}>│</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '0.1em',
              color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)',
              textShadow: isConnected ? '0 0 8px var(--cyber-green)' : '0 0 8px var(--cyber-red)',
            }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <Zap size={10} style={{ color: 'var(--cyber-yellow)', opacity: 0.5 }} />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: 'var(--cyber-text-dim)', letterSpacing: '0.05em',
            }}>
              v2.0.77
            </span>
          </div>
        </div>
      </header>

      {/* Separator */}
      <div style={{ height: 4, background: 'linear-gradient(90deg, transparent, var(--cyber-yellow) 30%, var(--cyber-yellow) 70%, transparent)', opacity: 0.6 }} />

      {/* Compact sticky header (mobile) */}
      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <Smartphone size={14} style={{ color: 'var(--cyber-text-dim)' }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.5rem', fontWeight: 700,
            letterSpacing: '0.15em', color: 'var(--cyber-yellow)',
            padding: '2px 5px', background: 'rgba(252,227,0,0.08)',
            border: '1px solid rgba(252,227,0,0.2)',
          }}>BLIK</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#e0e0e0', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
            {blikNumber}
          </span>
          {copied ? <Check size={12} style={{ color: 'var(--cyber-green)' }} /> : <Copy size={12} style={{ color: 'var(--cyber-text-dim)' }} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em',
            color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)',
          }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
          <button onClick={() => setIsMuted(!isMuted)} style={{
            border: isMuted ? '1px solid rgba(255,0,51,0.4)' : '1px solid #2a2a2a',
            color: isMuted ? 'var(--cyber-red)' : 'var(--cyber-text-dim)',
            background: 'transparent', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
          }}>
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </>
  );
}
