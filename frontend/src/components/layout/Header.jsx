import { Volume2, VolumeX, Smartphone, Copy, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/*
  Ball animation: TWO full symmetric arcs, each going OVER the net.
  - Forward  L→R : 0%  → 50%
  - Return   R→L : 50% → 100%
  Both squish on impact at 0%/50%/100%.
  Container height: 90px. Table at top=55%. Net top ≈ 28% from top.
  Peak of arc ≈ top=5% — well clear of the net.
*/
const BALL_CSS = `
  @keyframes ball-flight {
    /* LEFT PADDLE IMPACT — table near edge at ~66% */
    0%   { left: 8%;  top: 50%; transform: translate(-50%,-50%) scaleX(1.6) scaleY(0.55); }
    2%   { left: 8%;  top: 50%; transform: translate(-50%,-50%) scale(1); }
    /* arc up and over net → right */
    12%  { left: 23%; top: 44%; transform: translate(-50%,-50%) scale(1); }
    23%  { left: 37%; top: 16%; transform: translate(-50%,-50%) scale(1); }
    34%  { left: 50%; top: 6%;  transform: translate(-50%,-50%) scale(1); }
    45%  { left: 63%; top: 16%; transform: translate(-50%,-50%) scale(1); }
    48%  { left: 78%; top: 44%; transform: translate(-50%,-50%) scale(1); }
    /* RIGHT PADDLE IMPACT */
    50%  { left: 92%; top: 50%; transform: translate(-50%,-50%) scale(1); }
    51%  { left: 92%; top: 50%; transform: translate(-50%,-50%) scaleX(1.6) scaleY(0.55); }
    53%  { left: 92%; top: 50%; transform: translate(-50%,-50%) scale(1); }
    /* arc up and over net → left */
    62%  { left: 78%; top: 44%; transform: translate(-50%,-50%) scale(1); }
    66%  { left: 63%; top: 16%; transform: translate(-50%,-50%) scale(1); }
    75%  { left: 50%; top: 6%;  transform: translate(-50%,-50%) scale(1); }
    84%  { left: 37%; top: 16%; transform: translate(-50%,-50%) scale(1); }
    88%  { left: 23%; top: 44%; transform: translate(-50%,-50%) scale(1); }
    /* LEFT PADDLE IMPACT again */
    98%  { left: 8%;  top: 50%; transform: translate(-50%,-50%) scale(1); }
    100% { left: 8%;  top: 50%; transform: translate(-50%,-50%) scaleX(1.6) scaleY(0.55); }
  }
  /* Left paddle: kicks at 0/100% */
  @keyframes left-paddle-hit {
    0%   { transform: rotate(-45deg) scale(1.1); }
    6%   { transform: rotate(-45deg) scale(1); }
    94%  { transform: rotate(-45deg) scale(1); }
    100% { transform: rotate(-45deg) scale(1.1); }
  }
  /* Right paddle: kicks at 50% */
  @keyframes right-paddle-hit {
    0%,48%  { transform: rotate(45deg) scale(1); }
    50%     { transform: rotate(45deg) scale(1.1); }
    56%     { transform: rotate(45deg) scale(1); }
    100%    { transform: rotate(45deg) scale(1); }
  }
`;
const BALL_DUR = '1.8s';

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

  const pSize = 'clamp(26px, 4.2vw, 42px)';

  return (
    <>
      <style>{BALL_CSS}</style>

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

      <header style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #060609 0%, #0a0a0f 100%)',
        borderBottom: '1px solid #1a1a2e',
      }}>
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 70, height: 2, background: '#818cf8', boxShadow: '0 0 10px rgba(129,140,248,0.7)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 70, height: 2, background: '#818cf8', boxShadow: '0 0 10px rgba(129,140,248,0.7)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 44, background: 'linear-gradient(to bottom, #818cf8, transparent)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 2, height: 44, background: 'linear-gradient(to bottom, #818cf8, transparent)', zIndex: 2 }} />

        {/* TOP BAR */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #12121e' }}>
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#08080d', border: '1px solid #252535',
            padding: '7px 12px', cursor: 'pointer', transition: 'all 0.18s',
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            <Smartphone size={14} style={{ color: 'var(--cyber-text-dim)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', color: '#818cf8', padding: '2px 6px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)' }}>BLIK</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.06em', color: '#e0e0e0' }}>{blikNumber}</span>
            <div style={{ width: 1, height: 14, background: '#252535', margin: '0 2px' }} />
            {copied ? <Check size={13} style={{ color: 'var(--cyber-green)' }} /> : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cyber-text-dim)' }}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
          </button>
          <button onClick={() => setIsMuted(!isMuted)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
            border: isMuted ? '1px solid rgba(255,0,51,0.5)' : '1px solid #252535',
            color: isMuted ? 'var(--cyber-red)' : 'var(--cyber-text-dim)',
            background: isMuted ? 'rgba(255,0,51,0.08)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.18s',
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>

        {/* HERO */}
        <div style={{ position: 'relative', zIndex: 10, padding: '18px 16px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ height: 1, width: 36, background: 'linear-gradient(to right, transparent, rgba(129,140,248,0.5))' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.28em', color: 'rgba(129,140,248,0.55)', textTransform: 'uppercase' }}>CENTRUM DOWODZENIA</span>
            <div style={{ height: 1, width: 36, background: 'linear-gradient(to left, transparent, rgba(129,140,248,0.5))' }} />
          </div>

          {/* ════════ BALL ARENA ════════
              Layout: [LEFT PADDLE] [CENTER STRIP] [RIGHT PADDLE]
              The center strip contains the 3D table + net + ball.
          */}
          <div style={{
            display: 'flex', alignItems: 'center',
            width: '100%', maxWidth: 520, marginBottom: 14,
          }}>
            {/* LEFT PADDLE */}
            <div style={{ flexShrink: 0, zIndex: 2, animation: chaosMode ? 'none' : `left-paddle-hit ${BALL_DUR} ease-in-out infinite`, transform: 'rotate(-45deg)' }}>
              <Paddle size={pSize} />
            </div>

            {/* CENTER STRIP */}
            <div style={{ flex: 1, height: 100, position: 'relative', margin: '0 6px' }}>

              {/* ════ 3D TABLE ════
                  Viewed from slight elevation — near edge wider, far edge narrower.
                  Trapezoid top + vertical front face + drop shadow = depth.
              */}

              {/* Drop shadow beneath table */}
              <div style={{
                position: 'absolute', left: '4%', right: '4%', top: '74%',
                height: 8, borderRadius: '50%',
                background: 'rgba(129,140,248,0.08)',
                filter: 'blur(6px)',
              }} />

              {/* Table TOP FACE — trapezoid: near edge full-width, far edge inset */}
              <div style={{
                position: 'absolute', left: 0, right: 0,
                top: '50%', height: 14,
                background: 'linear-gradient(180deg, rgba(30,35,80,0.9) 0%, rgba(20,24,60,0.95) 100%)',
                clipPath: 'polygon(3% 100%, 97% 100%, 87% 0%, 13% 0%)',
                border: 'none',
              }} />
              {/* Top face near-edge line (bright) */}
              <div style={{
                position: 'absolute', left: '3%', right: '3%', top: 'calc(50% + 14px)',
                height: 2,
                background: 'linear-gradient(90deg, transparent, rgba(165,180,252,0.7) 10%, rgba(165,180,252,0.7) 90%, transparent)',
                boxShadow: '0 0 6px rgba(129,140,248,0.4)',
              }} />
              {/* Top face far-edge line (dimmer — perspective) */}
              <div style={{
                position: 'absolute', left: '13%', right: '13%', top: '50%',
                height: 1,
                background: 'rgba(129,140,248,0.25)',
              }} />

              {/* Table FRONT FACE — thin strip below near edge */}
              <div style={{
                position: 'absolute', left: '3%', right: '3%', top: 'calc(50% + 16px)',
                height: 5,
                background: 'linear-gradient(180deg, rgba(129,140,248,0.15), rgba(129,140,248,0.04))',
                borderBottom: '1px solid rgba(129,140,248,0.15)',
              }} />

              {/* White centre line on table surface */}
              <div style={{
                position: 'absolute', left: '50%', top: '50%', height: 14,
                width: 1.5, transform: 'translateX(-50%)',
                background: 'rgba(200,210,255,0.2)',
                clipPath: 'polygon(0 100%, 100% 100%, 120% 0%, -20% 0%)',
              }} />

              {/* ════ NET ════ */}
              {/* Net shadow on table */}
              <div style={{
                position: 'absolute', left: 'calc(50% - 4px)', top: 'calc(50% + 11px)',
                width: 8, height: 8,
                background: 'rgba(0,0,0,0.3)',
                filter: 'blur(3px)',
              }} />
              {/* Net body — slightly trapezoidal, wider at bottom */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% - 20px)', top: 'calc(50% - 11px)',
                width: 40, height: 18,
                background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(165,180,252,0.22) 2px, rgba(165,180,252,0.22) 3px)',
                border: '1.5px solid rgba(200,214,255,0.6)',
                borderBottom: 'none',
                clipPath: 'polygon(0% 100%, 100% 100%, 96% 0%, 4% 0%)',
                boxShadow: '0 -2px 8px rgba(129,140,248,0.2)',
              }} />
              {/* Net top bar (brightest) */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% - 21px)', top: 'calc(50% - 12px)',
                width: 42, height: 2.5,
                background: 'rgba(200,214,255,0.75)',
                boxShadow: '0 0 6px rgba(165,180,252,0.5)',
                borderRadius: '1px',
              }} />
              {/* Left post */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% - 22px)', top: 'calc(50% - 14px)',
                width: 3, height: 24,
                background: 'linear-gradient(180deg, rgba(200,214,255,0.8), rgba(165,180,252,0.4))',
                borderRadius: '1px 1px 0 0',
              }} />
              {/* Right post */}
              <div style={{
                position: 'absolute',
                left: 'calc(50% + 19px)', top: 'calc(50% - 14px)',
                width: 3, height: 24,
                background: 'linear-gradient(180deg, rgba(200,214,255,0.8), rgba(165,180,252,0.4))',
                borderRadius: '1px 1px 0 0',
              }} />

              {/* ── BALL ── floats above table layer */}
              {!chaosMode && (
                <>
                  {/* Ghost trail */}
                  <div style={{
                    position: 'absolute', width: 8, height: 8, borderRadius: '50%',
                    background: 'rgba(200,210,255,0.15)',
                    animation: `ball-flight ${BALL_DUR} linear infinite`,
                    animationDelay: '-0.09s',
                    zIndex: 5, pointerEvents: 'none',
                  }} />
                  {/* Main ball */}
                  <div style={{
                    position: 'absolute', width: 13, height: 13, borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 32%, #ffffff 0%, #d8dcf8 60%, #b0b8e8 100%)',
                    boxShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 3px rgba(129,140,248,0.6), 0 2px 5px rgba(0,0,0,0.7)',
                    animation: `ball-flight ${BALL_DUR} linear infinite`,
                    zIndex: 6, pointerEvents: 'none',
                  }} />
                </>
              )}
            </div>

            {/* RIGHT PADDLE */}
            <div style={{ flexShrink: 0, zIndex: 2, animation: chaosMode ? 'none' : `right-paddle-hit ${BALL_DUR} ease-in-out infinite`, transform: 'rotate(45deg)' }}>
              <Paddle size={pSize} />
            </div>
          </div>

          {/* TITLE */}
          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
            <span style={{
              display: 'block', fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 'clamp(2rem, 8vw, 4rem)', letterSpacing: '0.06em', lineHeight: 1, textAlign: 'center',
              ...(chaosMode ? {
                color: '#a5b4fc',
                animation: 'headerBounce 0.4s ease-in-out 3',
                textShadow: '0 0 30px rgba(129,140,248,0.8), 2px 2px 0 rgba(0,0,0,0.9)',
              } : {
                color: '#c7d2fe',
                textShadow: '0 0 30px rgba(129,140,248,0.2), 2px 2px 0 rgba(0,0,0,0.95)',
              }),
            }}>PING-PONG</span>
          </button>

          {/* Status */}
          <div style={{ width: '100%', maxWidth: '22rem', height: 1, margin: '14px 0 10px', background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3) 50%, transparent)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: tick ? '#818cf8' : 'rgba(129,140,248,0.1)', textShadow: tick ? '0 0 10px rgba(129,140,248,0.7)' : 'none', transition: 'color 0.15s, text-shadow 0.15s' }}>⚡ JACK IN ⚡</span>
            <span style={{ color: '#1a1a2e' }}>│</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)', textShadow: isConnected ? '0 0 8px var(--cyber-green)' : '0 0 8px var(--cyber-red)' }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color: '#1a1a2e' }}>│</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--cyber-text-dim)' }}>v2.0.77</span>
          </div>
        </div>
      </header>

      <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #818cf8 30%, #818cf8 70%, transparent)', opacity: 0.5 }} />

      {/* Compact sticky (mobile) */}
      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.9rem' }}>🏓</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', color: '#818cf8', padding: '2px 5px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)' }}>BLIK</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#e0e0e0', fontSize: '0.85rem', letterSpacing: '0.06em' }}>{blikNumber}</span>
          {copied ? <Check size={12} style={{ color: 'var(--cyber-green)' }} /> : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cyber-text-dim)' }}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)' }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
          <button onClick={() => setIsMuted(!isMuted)} style={{ border: isMuted ? '1px solid rgba(255,0,51,0.4)' : '1px solid #252535', color: isMuted ? 'var(--cyber-red)' : 'var(--cyber-text-dim)', background: 'transparent', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }}>
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </>
  );
}

/* Reusable paddle component */
function Paddle({ size }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a1a2e, #252540)',
        border: '2px solid #818cf8',
        boxShadow: '0 0 12px rgba(129,140,248,0.45), 0 0 24px rgba(129,140,248,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Rubber face */}
        <div style={{ width: '52%', height: '52%', borderRadius: '50%', background: '#a5b4fc', opacity: 0.9, position: 'relative', zIndex: 1 }} />
        {/* Grip lines */}
        <div style={{ position: 'absolute', top: '30%', left: '12%', right: '12%', height: '1px', background: 'rgba(165,180,252,0.4)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '8%', right: '8%', height: '1px', background: 'rgba(165,180,252,0.25)' }} />
        <div style={{ position: 'absolute', top: '68%', left: '12%', right: '12%', height: '1px', background: 'rgba(165,180,252,0.4)' }} />
      </div>
      {/* Handle */}
      <div style={{
        position: 'absolute', bottom: 'clamp(-13px,-2vw,-17px)', left: '50%',
        transform: 'translateX(-50%)',
        width: 'clamp(5px,0.9vw,7px)', height: 'clamp(14px,2.2vw,20px)',
        background: 'linear-gradient(to bottom, #555, #1a1a1a)',
        borderRadius: '0 0 3px 3px',
      }} />
    </div>
  );
}
