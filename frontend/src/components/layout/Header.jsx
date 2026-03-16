import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ── Ball animation ────────────────────────────────────────────────────────
   Multi-keyframe arc so ball traces a real parabola OVER the net.
   Container is 80px tall. Table at 50% = 40px. Net top ≈ 20px from top.
   Ball arc peak = 4% (≈3px) — well above net. Many mid-points = smooth arc.
─────────────────────────────────────────────────────────────────────────── */
const BALL_CSS = `
  @keyframes ball-flight {
    0%   { left: 8%;  top: 50%; transform: translate(-50%,-50%) scaleX(1.5) scaleY(0.6); }
    2%   { left: 8%;  top: 50%; transform: translate(-50%,-50%) scale(1); }
    10%  { left: 20%; top: 32%; transform: translate(-50%,-50%) scale(1); }
    20%  { left: 32%; top: 14%; transform: translate(-50%,-50%) scale(1); }
    30%  { left: 42%; top: 5%;  transform: translate(-50%,-50%) scale(1); }
    47%  { left: 50%; top: 4%;  transform: translate(-50%,-50%) scale(1); }
    64%  { left: 58%; top: 5%;  transform: translate(-50%,-50%) scale(1); }
    74%  { left: 68%; top: 14%; transform: translate(-50%,-50%) scale(1); }
    84%  { left: 80%; top: 32%; transform: translate(-50%,-50%) scale(1); }
    92%  { left: 92%; top: 50%; transform: translate(-50%,-50%) scale(1); }
    95%  { left: 92%; top: 50%; transform: translate(-50%,-50%) scaleX(1.5) scaleY(0.6); }
    100% { left: 8%;  top: 50%; transform: translate(-50%,-50%) scale(1); }
  }
  @keyframes left-paddle-hit {
    0%   { transform: rotate(-45deg) scale(1); }
    3%   { transform: rotate(-32deg) scale(1.12); }
    9%   { transform: rotate(-45deg) scale(1); }
    100% { transform: rotate(-45deg) scale(1); }
  }
  @keyframes right-paddle-hit {
    0%,91%  { transform: rotate(45deg) scale(1); }
    94%     { transform: rotate(32deg) scale(1.12); }
    100%    { transform: rotate(45deg) scale(1); }
  }
`;
const BALL_DUR = '1.5s';

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

  // Paddle size
  const pSize = 'clamp(26px, 4.2vw, 42px)';

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
          background: 'radial-gradient(ellipse at 50% 30%, rgba(129,140,248,0.1) 0%, transparent 70%)' }} />
      )}

      {/* ════ MAIN HEADER ════ */}
      <header style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #060609 0%, #0a0a0f 100%)',
        borderBottom: '1px solid #1a1a2e',
      }}>
        {/* Indigo corner accents */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 70, height: 2, background: '#818cf8', boxShadow: '0 0 10px rgba(129,140,248,0.7)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 70, height: 2, background: '#818cf8', boxShadow: '0 0 10px rgba(129,140,248,0.7)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 44, background: 'linear-gradient(to bottom, #818cf8, transparent)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 2, height: 44, background: 'linear-gradient(to bottom, #818cf8, transparent)', zIndex: 2 }} />

        {/* ── TOP BAR ── */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #12121e' }}>

          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#08080d', border: '1px solid #252535',
            padding: '7px 12px', cursor: 'pointer', transition: 'all 0.18s',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            <Smartphone size={14} style={{ color: 'var(--cyber-text-dim)' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.18em', color: '#818cf8',
              padding: '2px 6px', background: 'rgba(129,140,248,0.1)',
              border: '1px solid rgba(129,140,248,0.25)',
            }}>BLIK</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.06em', color: '#e0e0e0' }}>
              {blikNumber}
            </span>
            <div style={{ width: 1, height: 14, background: '#252535', margin: '0 2px' }} />
            {copied
              ? <Check size={13} style={{ color: 'var(--cyber-green)' }} />
              : <Copy  size={13} style={{ color: 'var(--cyber-text-dim)' }} />}
          </button>

          <button onClick={() => setIsMuted(!isMuted)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36,
            border: isMuted ? '1px solid rgba(255,0,51,0.5)' : '1px solid #252535',
            color: isMuted ? 'var(--cyber-red)' : 'var(--cyber-text-dim)',
            background: isMuted ? 'rgba(255,0,51,0.08)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.18s',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>

        {/* ══ HERO SECTION ══ */}
        <div style={{ position: 'relative', zIndex: 10, padding: '18px 16px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Eyebrow label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ height: 1, width: 36, background: 'linear-gradient(to right, transparent, rgba(129,140,248,0.5))' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.28em', color: 'rgba(129,140,248,0.55)', textTransform: 'uppercase',
            }}>CENTRUM DOWODZENIA</span>
            <div style={{ height: 1, width: 36, background: 'linear-gradient(to left, transparent, rgba(129,140,248,0.5))' }} />
          </div>

          {/* ── BALL ARENA: paddles + bouncing ball, NO text inside ── */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'center',
            width: '100%', maxWidth: 500,
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            {/* LEFT PADDLE */}
            <div style={{
              flexShrink: 0,
              animation: chaosMode ? 'none' : `left-paddle-hit ${BALL_DUR} ease-in-out infinite`,
              transform: 'rotate(-45deg)',
              zIndex: 2,
            }}>
              <div style={{
                width: pSize, height: pSize, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a2e, #252540)',
                border: '2px solid #818cf8',
                boxShadow: '0 0 12px rgba(129,140,248,0.4), 0 0 24px rgba(129,140,248,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{ width: '52%', height: '52%', borderRadius: '50%', background: '#a5b4fc', opacity: 0.9 }} />
                <div style={{ position: 'absolute', top: '32%', left: '14%', right: '14%', height: '1px', background: 'rgba(165,180,252,0.4)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '9%', right: '9%', height: '1px', background: 'rgba(165,180,252,0.25)' }} />
                <div style={{ position: 'absolute', top: '65%', left: '14%', right: '14%', height: '1px', background: 'rgba(165,180,252,0.4)' }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 'clamp(-13px,-2vw,-17px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 'clamp(5px,0.9vw,7px)', height: 'clamp(14px,2.2vw,20px)',
                background: 'linear-gradient(to bottom, #444, #1a1a1a)',
                borderRadius: '0 0 3px 3px',
              }} />
            </div>

            {/* CENTER STRIP — ball bounces here, pure empty space */}
            <div style={{
              flex: 1, height: 80, position: 'relative', margin: '0 8px',
            }}>
              {/* Table surface */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '50%',
                height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3) 10%, rgba(129,140,248,0.3) 90%, transparent)',
              }} />

              {/* Net — vertical post + top crossbar only, clean ping-pong style */}
              {/* Post */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% - 1px)', top: 'calc(50% - 20px)',
                width: 2, height: 20,
                background: 'rgba(165,180,252,0.6)',
              }} />
              {/* Top crossbar */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% - 16px)', top: 'calc(50% - 21px)',
                width: 32, height: 2,
                background: 'rgba(165,180,252,0.7)',
                boxShadow: '0 0 4px rgba(129,140,248,0.4)',
              }} />
              {/* Net side posts (tiny dots at table edge) */}
              <div style={{ position: 'absolute', left: 'calc(50% - 16px)', top: 'calc(50% - 1px)', width: 3, height: 4, background: 'rgba(165,180,252,0.5)' }} />
              <div style={{ position: 'absolute', left: 'calc(50% + 13px)', top: 'calc(50% - 1px)', width: 3, height: 4, background: 'rgba(165,180,252,0.5)' }} />

              {!chaosMode && (
                <>
                  {/* Ghost trail */}
                  <div style={{
                    position: 'absolute', width: 9, height: 9, borderRadius: '50%',
                    background: 'rgba(165,180,252,0.18)',
                    animation: `ball-flight ${BALL_DUR} ease-in-out infinite`,
                    animationDelay: '-0.08s',
                    zIndex: 3, pointerEvents: 'none',
                  }} />
                  {/* Main ball */}
                  <div style={{
                    position: 'absolute', width: 13, height: 13, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #ffffff, #dde)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.7), 0 0 3px rgba(129,140,248,0.5), 0 2px 4px rgba(0,0,0,0.6)',
                    animation: `ball-flight ${BALL_DUR} ease-in-out infinite`,
                    zIndex: 4, pointerEvents: 'none',
                  }} />
                </>
              )}
            </div>

            {/* RIGHT PADDLE */}
            <div style={{
              flexShrink: 0,
              animation: chaosMode ? 'none' : `right-paddle-hit ${BALL_DUR} ease-in-out infinite`,
              transform: 'rotate(45deg)',
              zIndex: 2,
            }}>
              <div style={{
                width: pSize, height: pSize, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a2e, #252540)',
                border: '2px solid #818cf8',
                boxShadow: '0 0 12px rgba(129,140,248,0.4), 0 0 24px rgba(129,140,248,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{ width: '52%', height: '52%', borderRadius: '50%', background: '#a5b4fc', opacity: 0.9 }} />
                <div style={{ position: 'absolute', top: '32%', left: '14%', right: '14%', height: '1px', background: 'rgba(165,180,252,0.4)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '9%', right: '9%', height: '1px', background: 'rgba(165,180,252,0.25)' }} />
                <div style={{ position: 'absolute', top: '65%', left: '14%', right: '14%', height: '1px', background: 'rgba(165,180,252,0.4)' }} />
              </div>
              <div style={{
                position: 'absolute', bottom: 'clamp(-13px,-2vw,-17px)', left: '50%',
                transform: 'translateX(-50%)',
                width: 'clamp(5px,0.9vw,7px)', height: 'clamp(14px,2.2vw,20px)',
                background: 'linear-gradient(to bottom, #444, #1a1a1a)',
                borderRadius: '0 0 3px 3px',
              }} />
            </div>
          </div>
          {/* /ball arena */}

          {/* ── PING-PONG TITLE — fully separate, no collision ── */}
          <button
            onClick={handleTitleClick}
            aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span style={{
              display: 'block',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(2rem, 8vw, 4rem)',
              letterSpacing: '0.06em',
              lineHeight: 1,
              textAlign: 'center',
              ...(chaosMode ? {
                color: '#a5b4fc',
                animation: 'headerBounce 0.4s ease-in-out 3',
                textShadow: '0 0 30px rgba(129,140,248,0.8), 2px 2px 0 rgba(0,0,0,0.9)',
              } : {
                color: '#c7d2fe',
                textShadow: '0 0 30px rgba(129,140,248,0.2), 2px 2px 0 rgba(0,0,0,0.95)',
              }),
            }}>
              PING-PONG
            </span>
          </button>

          {/* ── Status bar ── */}
          <div style={{
            width: '100%', maxWidth: '22rem', height: 1, margin: '14px 0 10px',
            background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3) 50%, transparent)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: tick ? '#818cf8' : 'rgba(129,140,248,0.1)',
              textShadow: tick ? '0 0 10px rgba(129,140,248,0.7)' : 'none',
              transition: 'color 0.15s, text-shadow 0.15s',
            }}>⚡ JACK IN ⚡</span>
            <span style={{ color: '#1a1a2e' }}>│</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.1em',
              color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)',
              textShadow: isConnected ? '0 0 8px var(--cyber-green)' : '0 0 8px var(--cyber-red)',
            }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color: '#1a1a2e' }}>│</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--cyber-text-dim)' }}>
              v2.0.77
            </span>
          </div>
        </div>
      </header>

      {/* Bottom accent bar */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #818cf8 30%, #818cf8 70%, transparent)', opacity: 0.5 }} />

      {/* ── Compact sticky header (mobile) ── */}
      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '0.9rem' }}>🏓</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', color: '#818cf8', padding: '2px 5px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)' }}>BLIK</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#e0e0e0', fontSize: '0.85rem', letterSpacing: '0.06em' }}>{blikNumber}</span>
          {copied ? <Check size={12} style={{ color: 'var(--cyber-green)' }} /> : <Copy size={12} style={{ color: 'var(--cyber-text-dim)' }} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)' }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
          <button onClick={() => setIsMuted(!isMuted)} style={{ border: isMuted ? '1px solid rgba(255,0,51,0.4)' : '1px solid #252535', color: isMuted ? 'var(--cyber-red)' : 'var(--cyber-text-dim)', background: 'transparent', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }}>
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </>
  );
}
