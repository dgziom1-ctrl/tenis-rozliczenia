import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const CLICKS_NEEDED = 5;

export default function Header({ isMuted, setIsMuted, isConnected, onOpenPong, theme, onToggleTheme }) {
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
  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

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

  // PING-PONG: 5 kliknięć → chaos, easter egg przez klawiaturę (ponk) lub chaos nadal aktywuje się tutaj
  const handlePingPongClick = () => {
    clearTimeout(resetTimer.current);
    setClickCount(prev => {
      const next = prev + 1;
      if (next >= CLICKS_NEEDED) { activateChaos(); return 0; }
      const hints = ['', '🏓', '🏓🏓',
        a ? '>>> SEKRET <<<' : '🏓🏓🏓 coś tu jest...',
        a ? '!!! JESZCZE RAZ !!!' : '🏓🏓🏓🏓 jeszcze raz!',
      ];
      setHint(hints[next]);
      resetTimer.current = setTimeout(() => { setClickCount(0); setHint(''); }, 2000);
      return next;
    });
  };

  const activateChaos = () => {
    setHint('');
    setChaosMode(true);
    const pool = a
      ? ['👾','👾','🎮','💥','⬛','🟩','🏓','★']
      : ['🏓','🏓','⚡','🎱','💥','🌀','🎉','✨'];
    setConfetti(Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji:  pool[Math.floor(Math.random() * pool.length)],
      x:      Math.random() * 100,
      delay:  Math.random() * 0.8,
      dur:    1 + Math.random() * 1.5,
      size:   16 + Math.random() * 20,
      rotate: Math.random() * 360,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
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
    ppChaos:       { color: '#39ff14', textShadow: '0 0 20px #39ff14, 0 0 40px #39ff14', animation: 'arcadeShake 0.3s infinite' },
    hintStyle:     { border: '2px solid #176604', background: '#010300', color: '#39ff14', fontFamily: "'Press Start 2P',monospace", fontSize: '0.42rem' },
    chaosStyle:    { border: '2px solid #ff6b00', background: 'rgba(13,2,0,0.9)', color: '#ff6b00', textShadow: '0 0 10px #ff6b00', fontFamily: "'Press Start 2P',monospace", fontSize: '0.42rem' },
    chaosText:     '>>> CHAOS <<<',
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
    statusOnClr:   '#39ff14', statusOnShadow: '0 0 8px rgba(57,255,20,0.8)',
    statusOffClr:  '#ff3300', statusOffShadow: '0 0 8px rgba(255,51,0,0.8)',
    statusFont:    "'Press Start 2P',monospace",
    statusFontSz:  '0.4rem',
    climateClr:    null, // see render
    climateFontSz: '0.44rem',
    climateFont:   "'Press Start 2P',monospace",
  } : {
    headerBg:      'linear-gradient(to bottom, black, #030712, #111827)',
    headerBorder:  'none',
    topBarBg:      'rgba(0,0,0,0.4)',
    topBarBorder:  '1px solid rgba(22,78,99,0.5)',
    blikBorder:    '1px solid rgba(8,145,178,0.6)',
    blikLabelClr:  '#facc15',
    blikNumClr:    '#67e8f9',
    blikLabelBg:   'rgba(250,204,21,0.1)',
    iconClr:       '#06b6d4',
    copyClr:       'rgba(6,182,212,0.5)',
    muteOnBorder:  '2px solid rgba(239,68,68,0.6)', muteOnClr: '#f87171', muteOnBg: 'rgba(127,29,29,0.3)',
    muteOffBorder: '2px solid rgba(8,145,178,0.6)', muteOffClr: '#22d3ee', muteOffBg: 'rgba(0,0,0,0.6)',
    titleGrad:     'linear-gradient(90deg, white, #22d3ee, white)',
    titleFont:     'inherit',
    titleAnim:     'none',
    ppGrad:        'linear-gradient(90deg, #ec4899, #a855f7, #22d3ee)',
    ppChaos:       { color: '#fde047', animation: 'neonPulse 0.4s infinite, arcadeShake 0.3s infinite' },
    hintStyle:     { border: '1px solid #155e75', background: 'rgba(0,0,0,0.8)', color: '#22d3ee' },
    chaosStyle:    { border: '2px solid #fbbf24', background: 'rgba(120,53,15,0.9)', color: '#fde047', boxShadow: '0 0 20px rgba(255,215,0,0.5)' },
    chaosText:     '🎉 CHAOS MODE 🎉',
    loaderBg:      '#1f2937',
    loaderFill:    'linear-gradient(90deg, #06b6d4, #a855f7, #ec4899)',
    loaderChaos:   'linear-gradient(90deg, #fbbf24, #ef4444, #ec4899)',
    loaderShadow:  'rgba(6,182,212,0.4)',
    paddleL:       { bg: 'linear-gradient(135deg,#ec4899,#be185d)', shadow: '0 0 15px rgba(236,72,153,0.8)', inner: '#f9a8d4' },
    paddleR:       { bg: 'linear-gradient(135deg,#06b6d4,#0e7490)',  shadow: '0 0 15px rgba(34,211,238,0.8)',  inner: '#67e8f9' },
    handleBg:      'linear-gradient(to bottom,#d97706,#92400e)',
    ballClr:       '#22d3ee', ballShadow: 'rgba(34,211,238,1)',
    paddleClr:     '#ec4899', paddleShadow: 'rgba(236,72,153,0.8)',
    sepBg:         'linear-gradient(to bottom,#111827,#030712)',
    sepBorder:     '1px solid rgba(22,78,99,0.3)',
    sepLine:       'linear-gradient(90deg,transparent,rgba(6,182,212,0.4) 50%,transparent)',
    glowBlobs:     true,
    statusOnClr:   '#4ade80', statusOnShadow: '0 0 8px rgba(74,222,128,0.6)',
    statusOffClr:  '#f87171', statusOffShadow: '0 0 8px rgba(248,113,113,0.6)',
    statusFont:    'monospace',
    statusFontSz:  '0.7rem',
    climateClr:    null,
    climateFontSz: '0.7rem',
    climateFont:   'monospace',
  };

  const pSize = 'clamp(24px,4vw,40px)';
  const pInner = 'clamp(12px,2.5vw,20px)';

  return (
    <>
      {/* CONFETTI */}
      {confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{ left: `${c.x}%`, top: 0, fontSize: `${c.size}px`,
            animation: `confettiFall ${c.dur}s ${c.delay}s ease-in forwards`,
            transform: `rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity:1; }
          100% { transform: translateY(300px) rotate(720deg) scale(0.4); opacity:0; }
        }
        @keyframes neonPulse {
          0%,100% { text-shadow: 0 0 10px #ff0080, 0 0 20px #ff0080; }
          50%     { text-shadow: 0 0 20px #00d4ff, 0 0 40px #00d4ff; }
        }
        @keyframes arcadeShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes arcadeGlow {
          0%,100% { text-shadow: 2px 0 0 rgba(255,0,0,0.4), -2px 0 0 rgba(0,255,255,0.4); }
          50%     { text-shadow: -2px 0 0 rgba(255,0,0,0.4), 2px 0 0 rgba(0,255,255,0.4); }
        }
        @keyframes scanBeam {
          0%   { top: -5%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
      `}</style>

      <header style={{
        position: 'relative', overflow: 'hidden',
        background: C.headerBg,
        border: C.headerBorder,
        borderRadius: a ? 0 : '0.75rem 0.75rem 0 0',
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

        {/* Cyber glow blobs */}
        {C.glowBlobs && (
          <>
            <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(6,182,212,0.08)' }} />
            <div className="absolute top-10 right-1/4 w-24 h-24 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(236,72,153,0.08)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,255,0.1) 2px,rgba(0,255,255,0.1) 4px)' }} />
          </>
        )}

        {/* ══ TOP BAR: BLIK + MUTE ════════════════════ */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3"
          style={{ background: C.topBarBg, borderBottom: C.topBarBorder }}>

          {/* BLIK */}
          <button onClick={handleCopy}
            className="group flex items-center gap-2 px-3 py-2 transition-all duration-200"
            style={{ border: C.blikBorder, background: a ? 'transparent' : 'rgba(0,0,0,0.6)',
              borderRadius: a ? 0 : '0.5rem' }}>
            <Smartphone size={18} style={{ color: C.iconClr }} />
            <span style={{ fontWeight: 900, color: C.blikLabelClr,
              fontSize: a ? '0.5rem' : '0.75rem',
              fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
              letterSpacing: a ? '0.08em' : '0.2em',
              padding: '2px 6px', background: C.blikLabelBg,
              borderRadius: a ? 0 : '0.25rem' }}>BLIK</span>
            <span style={{ color: C.blikNumClr,
              fontFamily: a ? "'Press Start 2P',monospace" : 'monospace',
              fontSize: a ? '0.52rem' : '0.875rem',
              fontWeight: 'bold', letterSpacing: '0.05em' }}>{blikNumber}</span>
            <div style={{ width: 1, height: 16, background: C.blikBorder, margin: '0 2px' }} />
            {copied
              ? <Check size={16} style={{ color: '#4ade80' }} />
              : <Copy  size={16} style={{ color: C.copyClr }} />}
          </button>

          {/* Mute */}
          <button onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center w-10 h-10 transition-all duration-200"
            style={{
              border: isMuted ? C.muteOnBorder : C.muteOffBorder,
              color:  isMuted ? C.muteOnClr  : C.muteOffClr,
              background: isMuted ? C.muteOnBg : C.muteOffBg,
              borderRadius: a ? 0 : '0.5rem',
            }}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* ══ MAIN SECTION ════════════════════════════ */}
        <div className="relative z-10 px-4 py-8 flex flex-col items-center">

          {/* ASCII Pong */}
          <div className="ascii-pong-field mb-4">
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
              fontSize: 'clamp(1.1rem, 4vw, 2rem)',
              letterSpacing: a ? '0.05em' : '0.15em',
              fontStyle: a ? 'normal' : 'italic',
              fontFamily: C.titleFont,
              lineHeight: a ? 1.6 : 1.2,
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

              {/* PING-PONG — klikalny (5×→ chaos) */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button onClick={handlePingPongClick}
                  style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}>
                  <span className="block font-black whitespace-nowrap" style={{
                    fontSize: 'clamp(1.5rem, 5vw, 3rem)',
                    letterSpacing: a ? '0.05em' : '0.1em',
                    fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
                    lineHeight: a ? 1.5 : 1.2,
                    transition: 'all 0.3s',
                    ...(chaosMode ? C.ppChaos : {
                      backgroundImage: C.ppGrad,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }),
                  }}>
                    PING-PONG
                  </span>
                </button>

                {hint && !chaosMode && (
                  <div style={{ position: 'absolute', bottom: '-32px', left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', fontWeight: 900, padding: '3px 10px',
                    borderRadius: a ? 0 : '9999px', ...C.hintStyle }}>{hint}</div>
                )}
                {chaosMode && (
                  <div style={{ position: 'absolute', bottom: '-32px', left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', fontWeight: 900, padding: '3px 12px',
                    borderRadius: a ? 0 : '9999px', ...C.chaosStyle }}>{C.chaosText}</div>
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

          {/* Loader bar */}
          <div style={{ width: '100%', maxWidth: '28rem', height: '3px',
            background: C.loaderBg, borderRadius: a ? 0 : '9999px',
            overflow: 'hidden', marginTop: '2rem', marginBottom: '1.25rem' }}>
            <div className={chaosMode ? '' : 'animate-pulse'} style={{
              height: '100%', width: '100%', borderRadius: a ? 0 : '9999px',
              background: chaosMode ? C.loaderChaos : C.loaderFill,
              boxShadow: `0 0 8px ${C.loaderShadow}` }} />
          </div>

          {/* ── STATUS BAR ──────────────────────────── */}
          {/* Format: [Hasło klimatyczne] | [ONLINE/OFFLINE] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>

            {/* Hasło klimatyczne */}
            {a ? (
              // Arcade: INSERT COIN — miga
              <span style={{
                fontFamily: C.climateFont, fontSize: C.climateFontSz,
                color: arcadeTick ? '#39ff14' : '#0a2200',
                textShadow: arcadeTick ? '0 0 16px rgba(57,255,20,1), 0 0 30px rgba(57,255,20,0.4)' : 'none',
                transition: 'color 0.08s, text-shadow 0.08s',
                letterSpacing: '0.1em',
              }}>★ INSERT COIN ★</span>
            ) : (
              // Cyber: JACK IN — stałe, subtelne
              <span style={{
                fontFamily: C.climateFont, fontSize: C.climateFontSz,
                color: '#155e75',
                letterSpacing: '0.2em',
                fontWeight: 'bold',
              }}>JACK IN</span>
            )}

            {/* Separator */}
            <span style={{ color: a ? '#1a4d00' : '#1f2937', fontSize: '0.8rem' }}>│</span>

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
    </>
  );
}
