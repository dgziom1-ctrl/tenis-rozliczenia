import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ── Bouncing Ball Animation ──────────────────────────────────────────────
   The ball arcs between the two paddles. CSS-only, purely declarative.
   A separate "squish" overlay flashes on each paddle hit.
─────────────────────────────────────────────────────────────────────────── */
const BALL_CSS = `
  @keyframes ball-flight {
    0%    { left: 11%; top: 50%; transform: translate(-50%,-50%) scale(1);         }
    4%    { left: 11%; top: 50%; transform: translate(-50%,-50%) scaleX(1.5) scaleY(0.6); }
    5%    { left: 11%; top: 50%; transform: translate(-50%,-50%) scale(1);         }
    47%   { left: 50%; top:  8%; transform: translate(-50%,-50%) scale(1);         }
    94%   { left: 89%; top: 50%; transform: translate(-50%,-50%) scale(1);         }
    96%   { left: 89%; top: 50%; transform: translate(-50%,-50%) scaleX(1.5) scaleY(0.6); }
    97%   { left: 89%; top: 50%; transform: translate(-50%,-50%) scale(1);         }
    100%  { left: 11%; top: 50%; transform: translate(-50%,-50%) scale(1);         }
  }
  @keyframes left-paddle-hit {
    0%   { transform: rotate(-45deg); }
    4%   { transform: rotate(-35deg) scale(1.12); }
    10%  { transform: rotate(-45deg); }
    100% { transform: rotate(-45deg); }
  }
  @keyframes right-paddle-hit {
    0%   { transform: rotate(45deg); }
    94%  { transform: rotate(45deg); }
    96%  { transform: rotate(35deg) scale(1.12); }
    100% { transform: rotate(45deg); }
  }
  @keyframes ball-trail {
    0%   { opacity: 0.18; }
    47%  { opacity: 0.08; }
    94%  { opacity: 0.18; }
    100% { opacity: 0; }
  }
`;

const BALL_DURATION = '1.4s';

export default function Header({ isMuted, setIsMuted, isConnected, scrolled }) {
  const [copied,    setCopied]    = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti,  setConfetti]  = useState([]);
  const [tick,      setTick]      = useState(true);

  const chaosTimer = useRef(null);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  const tickTimer  = useRef(null);

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

  const handleTitleClick = () => {
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
      id: i, emoji: pool[Math.floor(Math.random() * pool.length)],
      x: Math.random() * 100, delay: Math.random() * 1.2,
      dur: 1.8 + Math.random() * 1.5, size: 18 + Math.random() * 24,
      rotate: Math.random() * 360, drift: (Math.random() - 0.5) * 120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  const pSize = 'clamp(28px, 4.5vw, 46px)';
  const pInner = 'clamp(14px, 2.2vw, 22px)';

  return (
    <>
      <style>{BALL_CSS}</style>

      {/* Chaos confetti */}
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
          background: 'radial-gradient(ellipse at 50% 30%, rgba(252,227,0,0.08) 0%, transparent 70%)' }} />
      )}

      {/* ════════════════ MAIN HEADER ════════════════ */}
      <header style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #080808 0%, #0d0d0d 100%)',
        borderBottom: '1px solid #1a1a1a',
      }}>
        {/* Yellow corner accent lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 2, background: 'var(--cyber-yellow)', boxShadow: '0 0 12px var(--cyber-yellow)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 2, background: 'var(--cyber-yellow)', boxShadow: '0 0 12px var(--cyber-yellow)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 50, background: 'linear-gradient(to bottom, var(--cyber-yellow), transparent)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 2, height: 50, background: 'linear-gradient(to bottom, var(--cyber-yellow), transparent)', zIndex: 2 }} />

        {/* ══ TOP BAR: BLIK + MUTE ══ */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 16px',
          borderBottom: '1px solid #141414' }}>

          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#080808', border: '1px solid #2a2a2a',
            padding: '7px 12px', cursor: 'pointer', transition: 'all 0.18s',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            <Smartphone size={14} style={{ color: 'var(--cyber-text-dim)' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.18em', color: 'var(--cyber-yellow)',
              padding: '2px 6px', background: 'rgba(252,227,0,0.08)',
              border: '1px solid rgba(252,227,0,0.2)',
            }}>BLIK</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
              letterSpacing: '0.06em', color: '#e0e0e0',
            }}>{blikNumber}</span>
            <div style={{ width: 1, height: 14, background: '#2a2a2a', margin: '0 2px' }} />
            {copied
              ? <Check size={13} style={{ color: 'var(--cyber-green)' }} />
              : <Copy  size={13} style={{ color: 'var(--cyber-text-dim)' }} />}
          </button>

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

        {/* ══ MAIN HERO SECTION ══ */}
        <div style={{ position: 'relative', zIndex: 10, padding: '20px 16px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to right, transparent, var(--cyber-yellow))' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.25em', color: 'rgba(252,227,0,0.7)', textTransform: 'uppercase',
            }}>CENTRUM DOWODZENIA</span>
            <div style={{ height: 1, width: 40, background: 'linear-gradient(to left, transparent, var(--cyber-yellow))' }} />
          </div>

          {/* ──────────── PADDLES + BALL + TITLE ──────────── */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'center',
            gap: 'clamp(12px, 3vw, 28px)',
            width: '100%', maxWidth: 560,
            justifyContent: 'center',
          }}>

            {/* ── LEFT PADDLE ── */}
            <div style={{
              position: 'relative', flexShrink: 0,
              animation: chaosMode ? 'none' : `left-paddle-hit ${BALL_DURATION} ease-in-out infinite`,
              transform: 'rotate(-45deg)',
            }}>
              {/* Paddle head */}
              <div style={{
                width: pSize, height: pSize, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1c1c1c, #2a2a2a)',
                border: '2px solid var(--cyber-yellow)',
                boxShadow: '0 0 14px rgba(252,227,0,0.4), 0 0 30px rgba(252,227,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* Rubber surface texture lines */}
                <div style={{ width: '55%', height: '55%', borderRadius: '50%', background: 'var(--cyber-yellow)', opacity: 0.9 }} />
                {/* Horizontal grip lines */}
                <div style={{ position: 'absolute', top: '30%', left: '15%', right: '15%', height: '1px', background: 'rgba(252,227,0,0.3)' }} />
                <div style={{ position: 'absolute', top: '45%', left: '10%', right: '10%', height: '1px', background: 'rgba(252,227,0,0.2)' }} />
                <div style={{ position: 'absolute', top: '60%', left: '15%', right: '15%', height: '1px', background: 'rgba(252,227,0,0.3)' }} />
              </div>
              {/* Handle */}
              <div style={{
                position: 'absolute',
                bottom: 'clamp(-14px,-2.2vw,-18px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 'clamp(6px,1vw,8px)', height: 'clamp(16px,2.5vw,24px)',
                background: 'linear-gradient(to bottom, #444, #1a1a1a)',
                borderRadius: '0 0 4px 4px',
              }} />
            </div>

            {/* ── TITLE + BOUNCING BALL CONTAINER ── */}
            <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>

              {/* Ping pong table lines (decorative) */}
              <div style={{
                position: 'absolute', left: 0, right: 0,
                top: '50%', height: '1px',
                background: 'rgba(252,227,0,0.08)',
              }} />
              {/* Net */}
              <div style={{
                position: 'absolute', left: '50%', top: '30%', bottom: '-4px',
                width: '2px', transform: 'translateX(-50%)',
                background: 'repeating-linear-gradient(to bottom, rgba(252,227,0,0.25) 0px, rgba(252,227,0,0.25) 4px, transparent 4px, transparent 8px)',
              }} />

              {/* ⚪ THE BOUNCING BALL */}
              {!chaosMode && (
                <>
                  {/* Trail (ghost ball slightly behind) */}
                  <div style={{
                    position: 'absolute',
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    animation: `ball-flight ${BALL_DURATION} ease-in-out infinite`,
                    animationDelay: '-0.07s',
                    zIndex: 3, pointerEvents: 'none',
                  }} />
                  {/* Main ball */}
                  <div style={{
                    position: 'absolute',
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #ffffff, #e0e0e0)',
                    boxShadow: '0 0 8px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.5)',
                    animation: `ball-flight ${BALL_DURATION} ease-in-out infinite`,
                    zIndex: 4, pointerEvents: 'none',
                  }} />
                </>
              )}

              {/* PING-PONG title */}
              <button
                onClick={handleTitleClick}
                aria-label="Ping Pong — kliknij 5x dla niespodzianki"
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <span style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: 'clamp(1.8rem, 7vw, 3.8rem)',
                  letterSpacing: '0.05em',
                  lineHeight: 1.15,
                  textAlign: 'center',
                  ...(chaosMode ? {
                    color: 'var(--cyber-yellow)',
                    animation: 'headerBounce 0.4s ease-in-out 3',
                    textShadow: '0 0 30px var(--cyber-yellow), 2px 2px 0 rgba(0,0,0,0.8)',
                  } : {
                    color: 'var(--cyber-yellow)',
                    textShadow: '0 0 20px rgba(252,227,0,0.25), 2px 2px 0px rgba(0,0,0,0.9)',
                  }),
                }}>
                  PING-PONG
                </span>
              </button>

              {/* Sub-label */}
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.12em',
                color: 'rgba(252,227,0,0.35)',
                textAlign: 'center',
                margin: '4px 0 0',
                textTransform: 'uppercase',
              }}>
                rozliczenia 🏓 family edition
              </p>
            </div>

            {/* ── RIGHT PADDLE ── */}
            <div style={{
              position: 'relative', flexShrink: 0,
              animation: chaosMode ? 'none' : `right-paddle-hit ${BALL_DURATION} ease-in-out infinite`,
              transform: 'rotate(45deg)',
            }}>
              <div style={{
                width: pSize, height: pSize, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1c1c1c, #2a2a2a)',
                border: '2px solid var(--cyber-yellow)',
                boxShadow: '0 0 14px rgba(252,227,0,0.4), 0 0 30px rgba(252,227,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{ width: '55%', height: '55%', borderRadius: '50%', background: 'var(--cyber-yellow)', opacity: 0.9 }} />
                <div style={{ position: 'absolute', top: '30%', left: '15%', right: '15%', height: '1px', background: 'rgba(252,227,0,0.3)' }} />
                <div style={{ position: 'absolute', top: '45%', left: '10%', right: '10%', height: '1px', background: 'rgba(252,227,0,0.2)' }} />
                <div style={{ position: 'absolute', top: '60%', left: '15%', right: '15%', height: '1px', background: 'rgba(252,227,0,0.3)' }} />
              </div>
              <div style={{
                position: 'absolute',
                bottom: 'clamp(-14px,-2.2vw,-18px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 'clamp(6px,1vw,8px)', height: 'clamp(16px,2.5vw,24px)',
                background: 'linear-gradient(to bottom, #444, #1a1a1a)',
                borderRadius: '0 0 4px 4px',
              }} />
            </div>
          </div>
          {/* /paddles-ball-title */}

          {/* ── Status / divider ── */}
          <div style={{
            width: '100%', maxWidth: '22rem', height: '1px', margin: '18px 0 12px',
            background: 'linear-gradient(90deg, transparent, rgba(252,227,0,0.35) 50%, transparent)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: tick ? 'var(--cyber-yellow)' : 'rgba(252,227,0,0.12)',
              textShadow: tick ? '0 0 10px var(--cyber-yellow)' : 'none',
              transition: 'color 0.15s, text-shadow 0.15s',
            }}>⚡ JACK IN ⚡</span>
            <span style={{ color: '#1e1e1e' }}>│</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.1em',
              color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)',
              textShadow: isConnected ? '0 0 8px var(--cyber-green)' : '0 0 8px var(--cyber-red)',
            }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color: '#1e1e1e' }}>│</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--cyber-text-dim)', letterSpacing: '0.05em',
            }}>v2.0.77</span>
          </div>
        </div>
      </header>

      {/* Bottom accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, var(--cyber-yellow) 30%, var(--cyber-yellow) 70%, transparent)', opacity: 0.55 }} />

      {/* ── Compact sticky header (mobile) ── */}
      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '1rem' }}>🏓</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700,
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
            fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
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
