import { Volume2, VolumeX, Smartphone, Copy, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const CLICKS_NEEDED = 5;

export default function Header({ isMuted, setIsMuted, isConnected, theme, onToggleTheme, scrolled }) {
  const [copied,     setCopied]     = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [chaosMode,  setChaosMode]  = useState(false);
  const [hint,       setHint]       = useState('');
  const [confetti,   setConfetti]   = useState([]);
  const [arcadeTick, setArcadeTick] = useState(true);

  const resetTimer      = useRef(null);
  const chaosTimer      = useRef(null);
  const arcadeTickTimer = useRef(null);

  const a          = theme === 'arcade';
  const z          = theme === 'zen';
  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  // Compact header on scroll passed as prop from App

  // INSERT COIN blink
  useEffect(() => {
    arcadeTickTimer.current = setInterval(() => setArcadeTick(p => !p), 700);
    return () => clearInterval(arcadeTickTimer.current);
  }, []);

  useEffect(() => () => {
    clearTimeout(resetTimer.current);
    clearTimeout(chaosTimer.current);
    clearInterval(arcadeTickTimer.current);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // PING-PONG: tap = toggle theme, 5 tapów = chaos
  const handlePingPongClick = () => {
    clearTimeout(resetTimer.current);

    // Toggle theme on every tap
    onToggleTheme();

    setClickCount(prev => {
      const next = prev + 1;
      if (next >= CLICKS_NEEDED) { activateChaos(); return 0; }
      resetTimer.current = setTimeout(() => { setClickCount(0); setHint(''); }, 2000);
      return next;
    });
  };

  const activateChaos = () => {
    setHint('');
    setChaosMode(true);

    // Konfetti dopasowane do motywu
    const pool = a
      ? ['👾','🎮','💥','🟩','🏓','⭐','🔥','💚']
      : z
      ? ['🌿','🍃','🌳','🍀','✨','🌸','🌾','🍂']
      : ['🏓','⚡','🎱','🌀','🎉','✨','🏆','💫'];

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

  // ── Colours & tokens ──────────────────────────────────
  const C = a ? {
    headerBg:      'linear-gradient(to bottom, #010300, #020500)',
    headerBorder:  '3px solid #1a4d00',
    topBarBg:      'rgba(0,0,0,0.6)',
    topBarBorder:  '1px solid #0d2900',
    blikBorder:    '1px solid #176604',
    blikLabelClr:  '#ff6b00',
    blikNumClr:    '#39ff14',
    blikLabelBg:   'rgba(255,107,0,0.1)',
    iconClr:       '#ff6b00',
    copyClr:       '#176604',
    muteOnBorder:  '2px solid #cc2200', muteOnClr: '#ff3300', muteOnBg: 'transparent',
    muteOffBorder: '2px solid #176604', muteOffClr: '#39ff14', muteOffBg: 'transparent',
    titleGrad:     'linear-gradient(90deg, #39ff14, #b8ffb0, #39ff14)',
    titleFont:     "'Press Start 2P', monospace",
    titleAnim:     'arcadeGlow 3s ease-in-out infinite',
    ppGrad:        'linear-gradient(90deg, #ff6b00, #ffaa00, #39ff14)',
    ppChaos:       { color: '#39ff14', textShadow: '0 0 20px #39ff14', animation: 'headerBounce 0.4s ease-in-out 3' },
    hintStyle:     { border: '2px solid #176604', background: '#010300', color: '#39ff14', fontFamily: "'Press Start 2P',monospace", fontSize: '0.42rem' },
    chaosStyle:    { border: '2px solid #39ff14', background: 'rgba(0,20,0,0.95)', color: '#39ff14', textShadow: '0 0 10px #39ff14', fontFamily: "'Press Start 2P',monospace", fontSize: '0.42rem' },
    chaosText:     '✦ COMBO x5! ✦',
    loaderBg:      '#0a2200',
    loaderFill:    'linear-gradient(90deg, #39ff14, #b8ffb0, #39ff14)',
    loaderChaos:   'linear-gradient(90deg, #ff6b00, #ffaa00, #ff6b00)',
    loaderShadow:  'rgba(57,255,20,0.6)',
    paddleL:       { bg: 'linear-gradient(135deg,#ff6b00,#cc4400)', shadow: '0 0 15px rgba(255,107,0,0.8)', inner: '#ffcc99' },
    paddleR:       { bg: 'linear-gradient(135deg,#39ff14,#22880a)',  shadow: '0 0 15px rgba(57,255,20,0.8)',  inner: '#b8ffb0' },
    handleBg:      'linear-gradient(to bottom,#d97706,#92400e)',
    ballClr:       '#39ff14', ballShadow: 'rgba(57,255,20,1)',
    paddleClr:     '#ff6b00', paddleShadow: 'rgba(255,107,0,0.8)',
    sepBg:         'linear-gradient(to bottom,#010300,#020500)',
    sepBorder:     '1px solid #0d2900',
    sepLine:       'linear-gradient(90deg,transparent,rgba(57,255,20,0.4) 50%,transparent)',
    glowBlobs:     false,
    glowZen:       false,
    statusOnClr:   '#39ff14', statusOnShadow: '0 0 8px rgba(57,255,20,0.8)',
    statusOffClr:  '#ff3300', statusOffShadow: '0 0 8px rgba(255,51,0,0.8)',
    statusFont:    "'Press Start 2P',monospace",
    statusFontSz:  '0.4rem',
    climateClr:    null, // see render
    climateFontSz: '0.44rem',
    climateFont:   "'Press Start 2P',monospace",
  } : z ? {
    // ── ZEN NATURE / DRUIDISM ─────────────────────────
    headerBg:      'linear-gradient(to bottom, #f0ebe0, #ede8df)',
    headerBorder:  '2px solid #c2b49a',
    topBarBg:      'rgba(240,235,224,0.85)',
    topBarBorder:  '1px solid rgba(165,143,112,0.35)',
    blikBorder:    '1px solid rgba(45,106,79,0.45)',
    blikLabelClr:  '#8b5e3c',
    blikNumClr:    '#2d6a4f',
    blikLabelBg:   'rgba(139,94,60,0.09)',
    iconClr:       '#2d6a4f',
    copyClr:       'rgba(45,106,79,0.45)',
    muteOnBorder:  '2px solid rgba(180,70,50,0.5)', muteOnClr: '#b44632', muteOnBg: 'rgba(180,70,50,0.08)',
    muteOffBorder: '2px solid rgba(45,106,79,0.5)', muteOffClr: '#2d6a4f', muteOffBg: 'transparent',
    titleGrad:     'linear-gradient(90deg, #1a4a35, #2d6a4f, #4a8c6a)',
    titleFont:     "'Cinzel Decorative', serif",
    titleAnim:     'none',
    ppGrad:        'linear-gradient(90deg, #8b5e3c, #4a8c6a, #2d6a4f)',
    ppChaos:       { color: '#2d6a4f', fontFamily: "'Cinzel', serif", animation: 'headerBounce 0.4s ease-in-out 3' },
    hintStyle:     { border: '1px solid #c2b49a', background: 'rgba(240,235,224,0.9)', color: '#5c7a60', fontFamily: "'Cinzel', serif", fontSize: '0.55rem', borderRadius: '0.5rem' },
    chaosStyle:    { border: '2px solid #2d6a4f', background: 'rgba(240,235,224,0.97)', color: '#2d6a4f', boxShadow: '0 6px 24px rgba(45,106,79,0.2)', fontFamily: "'Cinzel', serif", borderRadius: '1rem', fontSize: '0.62rem' },
    chaosText:     '✦ Bonus x5 ✦',
    loaderBg:      '#ddd5c8',
    loaderFill:    'linear-gradient(90deg, #2d6a4f, #7daa87, #2d6a4f)',
    loaderChaos:   'linear-gradient(90deg, #8b5e3c, #c49a6c, #8b5e3c)',
    loaderShadow:  'rgba(45,106,79,0.2)',
    paddleL:       { bg: 'linear-gradient(135deg,#8b5e3c,#6b4423)', shadow: '0 4px 14px rgba(139,94,60,0.4)', inner: '#c49a6c' },
    paddleR:       { bg: 'linear-gradient(135deg,#2d6a4f,#1a4a35)', shadow: '0 4px 14px rgba(45,106,79,0.4)', inner: '#7daa87' },
    handleBg:      'linear-gradient(to bottom,#8b5e3c,#6b4423)',
    ballClr:       '#2d6a4f', ballShadow: 'rgba(45,106,79,0.4)',
    paddleClr:     '#8b5e3c', paddleShadow: 'rgba(139,94,60,0.4)',
    sepBg:         'linear-gradient(to bottom,#ede8df,#e8ede8)',
    sepBorder:     '1px solid rgba(165,143,112,0.3)',
    sepLine:       'linear-gradient(90deg,transparent,rgba(45,106,79,0.25) 50%,transparent)',
    glowBlobs:     false,
    glowZen:       true,
    statusOnClr:   '#2d6a4f', statusOnShadow: 'none',
    statusOffClr:  '#b44632', statusOffShadow: 'none',
    statusFont:    "'Lato', sans-serif",
    statusFontSz:  '0.72rem',
    climateClr:    null,
    climateFontSz: '0.72rem',
    climateFont:   "'Cinzel', serif",
  } : {
    // ── SILENT LUXURY / INDIGO DARK ───────────────────────
    headerBg:      'linear-gradient(to bottom, #080c18, #0d1220)',
    headerBorder:  'none',
    topBarBg:      'rgba(8,12,24,0.6)',
    topBarBorder:  '1px solid rgba(148,163,184,0.08)',
    blikBorder:    '1px solid rgba(148,163,184,0.12)',
    blikLabelClr:  '#94a3b8',
    blikNumClr:    '#e2e8f0',
    blikLabelBg:   'rgba(148,163,184,0.06)',
    iconClr:       '#64748b',
    copyClr:       'rgba(100,116,139,0.6)',
    muteOnBorder:  '1px solid rgba(248,113,113,0.35)', muteOnClr: '#f87171', muteOnBg: 'rgba(127,29,29,0.15)',
    muteOffBorder: '1px solid rgba(148,163,184,0.15)', muteOffClr: '#64748b', muteOffBg: 'transparent',
    titleGrad:     'linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 50%, #e2e8f0 100%)',
    titleFont:     "'Inter', system-ui, sans-serif",
    titleAnim:     'none',
    ppGrad:        'linear-gradient(135deg, #c084fc, #818cf8, #a5b4fc)',
    ppChaos:       { color: '#a5b4fc', animation: 'headerBounce 0.4s ease-in-out 3' },
    hintStyle:     { border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(13,18,32,0.9)', color: 'rgba(148,163,184,0.6)', borderRadius: '0.4rem' },
    chaosStyle:    { border: '1px solid rgba(129,140,248,0.3)', background: 'rgba(13,18,32,0.96)', color: '#a5b4fc', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', borderRadius: '9999px' },
    chaosText:     '✦ combo ×5',
    loaderBg:      '#1e2436',
    loaderFill:    'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)',
    loaderChaos:   'linear-gradient(90deg, #c084fc, #818cf8, #6366f1)',
    loaderShadow:  'rgba(129,140,248,0.25)',
    paddleL:       { bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)', shadow: '0 4px 20px rgba(124,58,237,0.3)', inner: '#a78bfa' },
    paddleR:       { bg: 'linear-gradient(135deg,#4f46e5,#6366f1)', shadow: '0 4px 20px rgba(99,102,241,0.3)', inner: '#818cf8' },
    handleBg:      'linear-gradient(to bottom,#475569,#334155)',
    ballClr:       '#a5b4fc', ballShadow: 'rgba(165,180,252,0.6)',
    paddleClr:     '#818cf8', paddleShadow: 'rgba(129,140,248,0.4)',
    sepBg:         'linear-gradient(to bottom,#0d1220,#080c18)',
    sepBorder:     '1px solid rgba(148,163,184,0.06)',
    sepLine:       'linear-gradient(90deg,transparent,rgba(129,140,248,0.2) 50%,transparent)',
    glowBlobs:     true,
    glowZen:       false,
    statusOnClr:   '#86efac', statusOnShadow: 'none',
    statusOffClr:  '#f87171', statusOffShadow: 'none',
    statusFont:    "'Inter', system-ui, sans-serif",
    statusFontSz:  '0.72rem',
    climateClr:    null,
    climateFontSz: '0.72rem',
    climateFont:   "'Inter', system-ui, sans-serif",
  };

  const pSize = 'clamp(24px,4vw,40px)';
  const pInner = 'clamp(12px,2.5vw,20px)';

  return (
    <>
      {/* CONFETTI BURST */}
      {chaosMode && confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{
            left: `${c.x}%`,
            top: 0,
            fontSize: `${c.size}px`,
            animation: `confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift': `${c.drift}px`,
            transform: `rotate(${c.rotate}deg)`,
          }}>
          {c.emoji}
        </div>
      ))}

      {/* CHAOS OVERLAY — delikatny błysk koloru, nie inwertuje całego UI */}
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 49,
          animation: 'chaosFlash 0.6s ease-out forwards',
          background: a
            ? 'radial-gradient(ellipse at 50% 30%, rgba(57,255,20,0.12) 0%, transparent 70%)'
            : z
            ? 'radial-gradient(ellipse at 50% 30%, rgba(45,106,79,0.1) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 30%, rgba(168,85,247,0.12) 0%, transparent 70%)',
        }} />
      )}

      <header style={{
        position: 'relative', overflow: 'hidden',
        background: C.headerBg,
        border: C.headerBorder,
        borderRadius: a ? 0 : z ? '1.25rem 1.25rem 0 0' : '0.75rem 0.75rem 0 0',
      }}>

        {/* Arcade CRT effects */}
        {a && (
          <>
            <div className="absolute inset-0 pointer-events-none z-0"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)' }} />
            <div className="absolute w-full pointer-events-none z-0"
              style={{ height: '60px', background: 'linear-gradient(transparent,rgba(57,255,20,0.07),transparent)', animation: 'scanBeam 6s linear infinite' }} />
            {['top-2 left-3','top-2 right-3','bottom-2 left-3','bottom-2 right-3'].map((pos, i) => (
              <div key={i} className={`absolute ${pos} pointer-events-none z-20`}
                style={{ color: '#0d2900', fontFamily: "'Press Start 2P',monospace", fontSize: '0.55rem' }}>✛</div>
            ))}
          </>
        )}

        {/* Cyber glow blobs — subtle indigo/violet */}
        {C.glowBlobs && !C.glowZen && (
          <>
            <div className="absolute top-0 left-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(99,102,241,0.06)' }} />
            <div className="absolute top-8 right-1/4 w-32 h-32 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(124,58,237,0.05)' }} />
          </>
        )}

        {/* Zen nature light blobs */}
        {C.glowZen && (
          <>
            <div className="absolute top-0 left-0 w-48 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(125,170,135,0.18) 0%, transparent 70%)', borderRadius: '0 0 100% 0' }} />
            <div className="absolute top-0 right-0 w-40 h-28 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(139,94,60,0.12) 0%, transparent 65%)', borderRadius: '0 0 0 100%' }} />
            <div className="absolute bottom-0 left-1/3 w-56 h-20 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 80%, rgba(45,106,79,0.09) 0%, transparent 70%)' }} />
          </>
        )}

        {/* ══ TOP BAR: BLIK + MUTE ════════════════════ */}
        <div className="relative z-10 flex items-center justify-between px-4"
          style={{
            background: C.topBarBg,
            borderBottom: C.topBarBorder,
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
          }}>

          {/* BLIK */}
          <button onClick={handleCopy}
            className="group flex items-center gap-2 px-3 py-2 transition-all duration-200"
            style={{ border: C.blikBorder, background: a ? 'transparent' : z ? 'rgba(237,232,223,0.7)' : 'rgba(0,0,0,0.6)',
              borderRadius: a ? 0 : z ? '0.75rem' : '0.5rem' }}>
            <Smartphone size={18} style={{ color: C.iconClr }} />
            <span style={{ fontWeight: 900, color: C.blikLabelClr,
              fontSize: a ? '0.5rem' : z ? '0.72rem' : '0.75rem',
              fontFamily: a ? "'Press Start 2P',monospace" : z ? "'Cinzel', serif" : 'inherit',
              letterSpacing: a ? '0.08em' : '0.2em',
              padding: '2px 6px', background: C.blikLabelBg,
              borderRadius: a ? 0 : z ? '0.4rem' : '0.25rem' }}>BLIK</span>
            <span style={{ color: C.blikNumClr,
              fontFamily: a ? "'Press Start 2P',monospace" : z ? "'Lato', sans-serif" : 'monospace',
              fontSize: a ? '0.52rem' : '0.875rem',
              fontWeight: 'bold', letterSpacing: '0.05em' }}>{blikNumber}</span>
            <div style={{ width: 1, height: 16, background: C.blikBorder, margin: '0 2px' }} />
            {copied
              ? <Check size={16} style={{ color: '#4ade80' }} />
              : <Copy  size={16} style={{ color: C.copyClr }} />}
          </button>

          {/* Right side: mute only — theme toggle via PING-PONG tap */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setIsMuted(!isMuted)}
              className="flex items-center justify-center w-10 h-10 transition-all duration-200"
              style={{
                border: isMuted ? C.muteOnBorder : C.muteOffBorder,
                color:  isMuted ? C.muteOnClr  : C.muteOffClr,
                background: isMuted ? C.muteOnBg : C.muteOffBg,
                borderRadius: a ? 0 : z ? '0.6rem' : '0.5rem',
              }}>
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* ══ MAIN SECTION ════════════════════════════ */}
        <div className="relative z-10 px-4 py-5 flex flex-col items-center">

          {/* ASCII Pong */}
          <div className="ascii-pong-field mb-2">
            <span style={{ color: C.paddleClr, fontSize: '1.5rem', fontWeight: 'bold',
              textShadow: `0 0 10px ${C.paddleShadow}` }}>「</span>
            <div className="ball-court mx-4">
              <span className="ascii-ball animate-pulse"
                style={{ fontSize: '1.25rem', color: C.ballClr, textShadow: `0 0 12px ${C.ballShadow}` }}>●</span>
            </div>
            <span style={{ color: C.paddleClr, fontSize: '1.5rem', fontWeight: 'bold',
              textShadow: `0 0 10px ${C.paddleShadow}` }}>」</span>
          </div>

          {/* TYTUŁ */}
          <h1 className="text-center mb-4 w-full">

            {/* CENTRUM DOWODZENIA */}
            <span className="block font-black uppercase" style={{
              fontSize: a ? 'clamp(1.1rem, 4vw, 2rem)' : z ? 'clamp(1.6rem, 5vw, 2.8rem)' : 'clamp(1.4rem, 4.5vw, 2.4rem)',
              letterSpacing: a ? '0.05em' : z ? '0.1em' : '0.06em',
              fontStyle: 'normal',
              fontFamily: C.titleFont,
              lineHeight: a ? 1.6 : 1.15,
              fontWeight: a ? 900 : z ? 700 : 800,
              backgroundImage: C.titleGrad,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: C.titleAnim,
              marginBottom: '0.75rem',
            }}>
              CENTRUM DOWODZENIA
            </span>

            {/* PING-PONG + rakietki */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px,2vw,16px)', marginTop: '0.5rem', flexWrap: 'nowrap' }}>

              {/* Lewa rakietka */}
              <div style={{ position: 'relative', flexShrink: 0,
                transform: chaosMode ? 'rotate(720deg) scale(1.5)' : 'rotate(-45deg)',
                transition: 'transform 0.5s' }}>
                <div style={{ width: pSize, height: pSize, borderRadius: a ? 0 : '50%',
                  background: C.paddleL.bg, boxShadow: C.paddleL.shadow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: pInner, height: pInner, borderRadius: a ? 0 : '50%', background: C.paddleL.inner }} />
                </div>
                <div style={{ position: 'absolute', bottom: 'clamp(-10px,-1.8vw,-14px)', left: '50%',
                  transform: 'translateX(-50%)', width: 'clamp(6px,1vw,8px)', height: 'clamp(12px,2vw,20px)',
                  background: C.handleBg, borderRadius: a ? 0 : '0 0 4px 4px' }} />
              </div>

              {/* PING-PONG — tap = zmiana motywu, 5× = chaos */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={handlePingPongClick}
                  aria-label={a ? 'Zmień motyw na Cyber Ponk' : z ? 'Zmień motyw na Cyber Ponk' : 'Zmień motyw na Retro Arcade'}
                  style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
                >
                  <span className="block font-black whitespace-nowrap" style={{
                    fontSize: a ? 'clamp(1.5rem, 5vw, 3rem)' : z ? 'clamp(1.6rem, 5.5vw, 3.2rem)' : 'clamp(2rem, 7vw, 4rem)',
                    letterSpacing: a ? '0.05em' : z ? '0.08em' : '0.1em',
                    fontFamily: a ? "'Press Start 2P',monospace" : z ? "'Cinzel Decorative', serif" : 'inherit',
                    lineHeight: a ? 1.5 : z ? 1.3 : 1.2,
                    transition: 'all 0.3s',
                    ...(chaosMode ? C.ppChaos : {
                      backgroundImage: C.ppGrad,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }),
                  }}>
                    PING-PONG
                  </span>
                </button>

                {/* Subtelny hint "tap = motyw" */}
                {!chaosMode && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: a ? '0.38rem' : z ? '0.58rem' : '0.6rem',
                    fontFamily: a ? "'Press Start 2P',monospace" : z ? "'Cinzel', serif" : 'inherit',
                    color: a ? '#1a4d00' : z ? 'rgba(92,122,96,0.6)' : 'rgba(22,78,99,0.7)',
                    letterSpacing: '0.12em',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}>
                    {a ? '[ TAP → ZEN ]' : z ? '[ tap → cyber ]' : '[ tap → arcade ]'}
                  </div>
                )}

                {chaosMode && (
                  <div style={{ position: 'absolute', bottom: '-32px', left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', fontWeight: 900, padding: '3px 12px',
                    borderRadius: a ? 0 : z ? '1rem' : '9999px', ...C.chaosStyle }}>{C.chaosText}</div>
                )}
              </div>

              {/* Prawa rakietka */}
              <div style={{ position: 'relative', flexShrink: 0,
                transform: chaosMode ? 'rotate(-720deg) scale(1.5)' : 'rotate(45deg)',
                transition: 'transform 0.5s' }}>
                <div style={{ width: pSize, height: pSize, borderRadius: a ? 0 : '50%',
                  background: C.paddleR.bg, boxShadow: C.paddleR.shadow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: pInner, height: pInner, borderRadius: a ? 0 : '50%', background: C.paddleR.inner }} />
                </div>
                <div style={{ position: 'absolute', bottom: 'clamp(-10px,-1.8vw,-14px)', left: '50%',
                  transform: 'translateX(-50%)', width: 'clamp(6px,1vw,8px)', height: 'clamp(12px,2vw,20px)',
                  background: C.handleBg, borderRadius: a ? 0 : '0 0 4px 4px' }} />
              </div>
            </div>
          </h1>

          {/* Loader bar — only visible while connecting / chaos */}
          <div style={{ width: '100%', maxWidth: '28rem', height: '3px',
            background: C.loaderBg, borderRadius: a ? 0 : '9999px',
            overflow: 'hidden', marginTop: '1.25rem', marginBottom: '0.75rem',
            opacity: 1 }}>
            <div style={{
              height: '100%', width: '100%', borderRadius: a ? 0 : '9999px',
              background: chaosMode ? C.loaderChaos : C.loaderFill,
              boxShadow: `0 0 8px ${C.loaderShadow}` }} />
          </div>

          {/* ── STATUS BAR ──────────────────────────── */}
          {/* Format: [Hasło klimatyczne] | [ONLINE/OFFLINE] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>

            {/* Hasło klimatyczne */}
            {/* JACK IN — default theme, no blink */}
            {!a && !z && (
              <>
                <span style={{
                  fontFamily: C.climateFont, fontSize: C.climateFontSz,
                  color: 'rgba(129,140,248,0.5)',
                  letterSpacing: '0.12em',
                  fontWeight: 500,
                }}>PING · PONG</span>
                <span style={{ color: 'rgba(148,163,184,0.2)', fontSize: '0.8rem' }}>│</span>
              </>
            )}

            {/* INSERT COIN — arcade only */}
            {a && (
              <>
                <span style={{
                  fontFamily: C.climateFont, fontSize: C.climateFontSz,
                  color: arcadeTick ? '#39ff14' : '#0a2200',
                  textShadow: arcadeTick ? '0 0 16px rgba(57,255,20,1), 0 0 30px rgba(57,255,20,0.4)' : 'none',
                  transition: 'color 0.08s, text-shadow 0.08s',
                  letterSpacing: '0.1em',
                }}>★ INSERT COIN ★</span>
                <span style={{ color: '#1a4d00', fontSize: '0.8rem' }}>│</span>
              </>
            )}

            {/* IN NATURA — zen only */}
            {z && (
              <>
                <span style={{
                  fontFamily: C.climateFont, fontSize: C.climateFontSz,
                  color: '#5c7a60',
                  letterSpacing: '0.15em',
                  fontStyle: 'italic',
                }}>✦ in natura veritas ✦</span>
                <span style={{ color: 'rgba(92,122,96,0.4)', fontSize: '0.8rem' }}>│</span>
              </>
            )}

            {/* Status ONLINE / OFFLINE */}
            <span style={{
              fontFamily: C.statusFont, fontSize: C.statusFontSz,
              color:      isConnected ? C.statusOnClr  : C.statusOffClr,
              textShadow: isConnected ? C.statusOnShadow : C.statusOffShadow,
              letterSpacing: '0.05em',
              fontWeight: 'bold',
            }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Separator */}
      <div style={{ height: '1rem', background: C.sepBg, borderBottom: C.sepBorder }}>
        <div style={{ height: '1px', background: C.sepLine }} />
      </div>

      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        {/* BLIK w sticky headerze */}
        <button onClick={handleCopy}
          style={{
            background: 'transparent', border: 'none', padding: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
          <Smartphone size={15} style={{ color: C.iconClr, flexShrink: 0 }} />
          <span style={{
            fontWeight: 900,
            color: C.blikLabelClr,
            fontSize: a ? '0.55rem' : '0.6rem',
            fontFamily: a ? "'Press Start 2P', monospace" : z ? "'Cinzel', serif" : 'inherit',
            letterSpacing: '0.12em',
            padding: '2px 5px',
            background: C.blikLabelBg,
            border: `1px solid ${a ? 'rgba(255,107,0,0.4)' : z ? 'rgba(139,94,60,0.3)' : 'rgba(250,204,21,0.3)'}`,
            borderRadius: a ? 0 : z ? '0.3rem' : '3px',
          }}>BLIK</span>
          <span style={{
            color: C.blikNumClr,
            fontFamily: a ? "'Press Start 2P', monospace" : z ? "'Lato', sans-serif" : 'monospace',
            fontSize: a ? '0.7rem' : '0.9rem',
            fontWeight: 'bold',
            letterSpacing: '0.06em',
            textShadow: a
              ? '0 0 10px rgba(57,255,20,0.8), 0 0 20px rgba(57,255,20,0.4)'
              : z ? 'none'
              : '0 0 10px rgba(103,232,249,0.7), 0 0 20px rgba(103,232,249,0.3)',
          }}>{blikNumber}</span>
          {copied
            ? <Check size={13} style={{ color: '#4ade80' }} />
            : <Copy  size={13} style={{ color: C.copyClr, opacity: 0.7 }} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.6rem', fontWeight: 'bold',
            color: isConnected ? C.statusOnClr : C.statusOffClr,
            textShadow: isConnected ? C.statusOnShadow : C.statusOffShadow,
          }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              border: isMuted ? C.muteOnBorder : C.muteOffBorder,
              color:  isMuted ? C.muteOnClr   : C.muteOffClr,
              background: 'transparent',
              borderRadius: a ? 0 : z ? '0.5rem' : '0.4rem',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </>
  );
}
