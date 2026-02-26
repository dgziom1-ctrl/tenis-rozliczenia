import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const CLICKS_NEEDED = 5;
const LONG_PRESS_MS = 2000;

export default function Header({ isMuted, setIsMuted, isConnected, onOpenPong, theme, onToggleTheme }) {
  const [copied,        setCopied]        = useState(false);
  const [clickCount,    setClickCount]    = useState(0);
  const [chaosMode,     setChaosMode]     = useState(false);
  const [hint,          setHint]          = useState('');
  const [confetti,      setConfetti]      = useState([]);
  const [pressing,      setPressing]      = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [arcadeTick,    setArcadeTick]    = useState(true);

  const resetTimer       = useRef(null);
  const chaosTimer       = useRef(null);
  const longPressTimer   = useRef(null);
  const progressInterval = useRef(null);
  const arcadeTickTimer  = useRef(null);

  const isArcade   = theme === 'arcade';
  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  useEffect(() => {
    if (!isArcade) return;
    arcadeTickTimer.current = setInterval(() => setArcadeTick(p => !p), 700);
    return () => clearInterval(arcadeTickTimer.current);
  }, [isArcade]);

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePingPongClick = () => {
    clearTimeout(resetTimer.current);
    setClickCount(prev => {
      const next = prev + 1;
      if (next >= CLICKS_NEEDED) { activateChaos(); return 0; }
      const hints = ['', '🏓', '🏓🏓',
        isArcade ? '>>> SEKRET <<<' : '🏓🏓🏓 coś tu jest...',
        isArcade ? '!!! JESZCZE RAZ !!!' : '🏓🏓🏓🏓 jeszcze raz!',
      ];
      setHint(hints[next]);
      resetTimer.current = setTimeout(() => { setClickCount(0); setHint(''); }, 2000);
      return next;
    });
  };

  const activateChaos = () => {
    setHint('');
    setChaosMode(true);
    const pool = isArcade
      ? ['👾','👾','🎮','💥','⬛','🟩','🏓','★']
      : ['🏓','🏓','⚡','🎱','💥','🌀','🎉','✨'];
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji:  pool[Math.floor(Math.random() * pool.length)],
      x:      Math.random() * 100,
      delay:  Math.random() * 0.8,
      dur:    1 + Math.random() * 1.5,
      size:   16 + Math.random() * 20,
      rotate: Math.random() * 360,
    }));
    setConfetti(items);
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  const startLongPress = useCallback(() => {
    setPressing(true);
    setPressProgress(0);
    let elapsed = 0;
    progressInterval.current = setInterval(() => {
      elapsed += 50;
      setPressProgress(Math.min((elapsed / LONG_PRESS_MS) * 100, 100));
    }, 50);
    longPressTimer.current = setTimeout(() => {
      clearInterval(progressInterval.current);
      setPressing(false);
      setPressProgress(0);
      onOpenPong();
    }, LONG_PRESS_MS);
  }, [onOpenPong]);

  const cancelLongPress = useCallback(() => {
    clearTimeout(longPressTimer.current);
    clearInterval(progressInterval.current);
    setPressing(false);
    setPressProgress(0);
  }, []);

  useEffect(() => () => {
    clearTimeout(resetTimer.current);
    clearTimeout(chaosTimer.current);
    clearTimeout(longPressTimer.current);
    clearInterval(progressInterval.current);
    clearInterval(arcadeTickTimer.current);
  }, []);

  // ── Shorthand helpers ─────────────────────────────────
  const a = isArcade; // shorthand

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
        @keyframes rippleCyber {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes marqueeScroll {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes scanBeam {
          0%   { top: -5%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        @keyframes arcadeGlow {
          0%,100% { text-shadow: 2px 0 0 rgba(255,0,0,0.5), -2px 0 0 rgba(0,255,255,0.5); }
          50%     { text-shadow: -2px 0 0 rgba(255,0,0,0.5), 2px 0 0 rgba(0,255,255,0.5); }
        }
      `}</style>

      <header style={{
        position: 'relative',
        overflow: 'hidden',
        background: a
          ? 'linear-gradient(to bottom, #010300, #020500)'
          : 'linear-gradient(to bottom, black, #030712, #111827)',
        border: a ? '3px solid #1a4d00' : 'none',
        borderRadius: a ? 0 : '0.75rem 0.75rem 0 0',
      }}>

        {/* Arcade: CRT scanlines */}
        {a && (
          <>
            <div className="absolute inset-0 pointer-events-none z-0"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)' }} />
            <div className="absolute w-full pointer-events-none z-0"
              style={{ height: '60px', background: 'linear-gradient(transparent, rgba(57,255,20,0.07), transparent)',
                animation: 'scanBeam 6s linear infinite' }} />
          </>
        )}

        {/* Cyber: glow blobs */}
        {!a && (
          <>
            <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(6,182,212,0.08)' }} />
            <div className="absolute top-10 right-1/4 w-24 h-24 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(236,72,153,0.08)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,255,0.1) 2px,rgba(0,255,255,0.1) 4px)' }} />
          </>
        )}

        {/* Arcade: corner decorations */}
        {a && ['top-2 left-3','top-2 right-3','bottom-2 left-3','bottom-2 right-3'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} pointer-events-none z-20`}
            style={{ color: '#0d2900', fontFamily: "'Press Start 2P',monospace", fontSize: '0.55rem' }}>✛</div>
        ))}

        {/* ── ARCADE MARQUEE ─────────────────────────── */}
        {a && (
          <div className="relative z-10 overflow-hidden"
            style={{ background: '#000', borderBottom: '2px solid #0d2900', padding: '6px 0' }}>
            <div style={{ display: 'inline-block', whiteSpace: 'nowrap',
              animation: 'marqueeScroll 18s linear infinite' }}>
              {['★ CYBER PONK ★','🏓 PING PONG ★','★ INSERT COIN ★','🎮 HIGH SCORE ★',
                '★ FAMILY ARCADE ★','🏆 ROZLICZENIA ★'].map((t, i) => (
                <span key={i} style={{
                  margin: '0 3rem', fontWeight: 'bold',
                  color: i % 2 === 0 ? '#39ff14' : '#ff6b00',
                  fontFamily: "'Press Start 2P',monospace", fontSize: '0.48rem', letterSpacing: '0.1em',
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ══ TOP BAR: BLIK + MUTE ════════════════════ */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3"
          style={{
            background: a ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
            borderBottom: a ? '1px solid #0d2900' : '1px solid rgba(22,78,99,0.5)',
            backdropFilter: a ? 'none' : 'blur(4px)',
          }}>

          {/* BLIK */}
          <button onClick={handleCopy}
            className="group flex items-center gap-2 px-3 py-2 transition-all duration-200"
            style={{
              border: a ? '1px solid #176604' : '1px solid rgba(8,145,178,0.6)',
              background: a ? 'transparent' : 'rgba(0,0,0,0.6)',
              borderRadius: a ? 0 : '0.5rem',
            }}>
            <Smartphone size={18} style={{ color: a ? '#ff6b00' : '#06b6d4' }} />
            <span style={{
              fontWeight: 900,
              color: a ? '#ff6b00' : '#facc15',
              fontSize: a ? '0.48rem' : '0.75rem',
              fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
              letterSpacing: a ? '0.08em' : '0.2em',
              padding: '2px 6px',
              background: a ? 'rgba(255,107,0,0.1)' : 'rgba(250,204,21,0.1)',
              borderRadius: a ? 0 : '0.25rem',
            }}>BLIK</span>
            <span style={{
              color: a ? '#39ff14' : '#67e8f9',
              fontFamily: a ? "'Press Start 2P',monospace" : 'monospace',
              fontSize: a ? '0.52rem' : '0.875rem',
              fontWeight: 'bold',
              letterSpacing: '0.05em',
            }}>{blikNumber}</span>
            <div style={{ width: 1, height: 16,
              background: a ? '#176604' : 'rgba(8,145,178,0.5)', margin: '0 2px' }} />
            {copied
              ? <Check size={16} style={{ color: '#4ade80' }} />
              : <Copy  size={16} style={{ color: a ? '#176604' : 'rgba(6,182,212,0.5)' }} />}
          </button>

          {/* Mute */}
          <button onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center w-10 h-10 transition-all duration-200"
            style={{
              border: isMuted
                ? (a ? '2px solid #cc2200' : '2px solid rgba(239,68,68,0.6)')
                : (a ? '2px solid #176604' : '2px solid rgba(8,145,178,0.6)'),
              color: isMuted
                ? (a ? '#ff3300' : '#f87171')
                : (a ? '#39ff14' : '#22d3ee'),
              background: isMuted
                ? (a ? 'transparent' : 'rgba(127,29,29,0.3)')
                : (a ? 'transparent' : 'rgba(0,0,0,0.6)'),
              borderRadius: a ? 0 : '0.5rem',
            }}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* ══ MAIN SECTION ════════════════════════════ */}
        <div className="relative z-10 px-4 py-8 flex flex-col items-center">

          {/* 🕹️ long press → Pong */}
          <div className="flex flex-col items-center mb-2" style={{ position: 'relative' }}>
            <button
              onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
              onTouchStart={e => { e.preventDefault(); startLongPress(); }}
              onTouchEnd={cancelLongPress} onTouchCancel={cancelLongPress}
              style={{
                fontSize: '2.25rem', background: 'transparent', border: 'none',
                cursor: 'pointer', position: 'relative',
                transform: pressing ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s',
                WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
                outline: 'none',
              }}>
              {pressing && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', width: 40, height: 40,
                    border: `2px solid ${a ? '#39ff14' : '#22d3ee'}`,
                    borderRadius: a ? 0 : '50%',
                    animation: 'rippleCyber 0.7s ease-out infinite', opacity: 0.7 }} />
                  {!a && <span style={{ position: 'absolute', width: 40, height: 40,
                    border: '2px solid #22d3ee', borderRadius: '50%',
                    animation: 'rippleCyber 0.7s ease-out 0.3s infinite', opacity: 0.4 }} />}
                </span>
              )}
              🕹️
            </button>

            {/* Progress bar */}
            <div style={{
              width: pressing ? '56px' : '0', height: pressing ? '3px' : '0',
              marginTop: pressing ? '6px' : '0',
              overflow: 'hidden', background: a ? '#0d2900' : 'rgba(22,78,99,0.5)',
              borderRadius: a ? 0 : '9999px', transition: 'width 0.2s, height 0.2s',
            }}>
              <div style={{ height: '100%', width: `${pressProgress}%`,
                background: a ? '#39ff14' : '#22d3ee',
                boxShadow: `0 0 6px ${a ? 'rgba(57,255,20,0.8)' : 'rgba(34,211,238,0.8)'}` }} />
            </div>
          </div>

          {/* ASCII Pong */}
          <div className="ascii-pong-field mb-4">
            <span style={{ color: a ? '#ff6b00' : '#ec4899', fontSize: '1.5rem', fontWeight: 'bold',
              textShadow: `0 0 10px ${a ? 'rgba(255,107,0,0.8)' : 'rgba(236,72,153,0.8)'}` }}>「</span>
            <div className="ball-court mx-4">
              <span className="ascii-ball animate-pulse" style={{ fontSize: '1.25rem',
                color: a ? '#39ff14' : '#22d3ee',
                textShadow: `0 0 12px ${a ? 'rgba(57,255,20,1)' : 'rgba(34,211,238,1)'}` }}>●</span>
            </div>
            <span style={{ color: a ? '#ff6b00' : '#ec4899', fontSize: '1.5rem', fontWeight: 'bold',
              textShadow: `0 0 10px ${a ? 'rgba(255,107,0,0.8)' : 'rgba(236,72,153,0.8)'}` }}>」</span>
          </div>

          {/* ── TYTUŁ ─────────────────────────────────── */}
          <h1 className="text-center mb-4 w-full">

            {/* CENTRUM DOWODZENIA */}
            <span className="block font-black uppercase"
              style={{
                display: 'block',
                fontSize: 'clamp(1.1rem, 4vw, 2rem)',
                letterSpacing: a ? '0.05em' : '0.15em',
                fontStyle: a ? 'normal' : 'italic',
                fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
                lineHeight: a ? 1.6 : 1.2,
                backgroundImage: a
                  ? 'linear-gradient(90deg, #39ff14, #b8ffb0, #39ff14)'
                  : 'linear-gradient(90deg, white, #22d3ee, white)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: a ? 'arcadeGlow 3s ease-in-out infinite' : 'none',
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
                <div style={{
                  width: 'clamp(24px,4vw,40px)', height: 'clamp(24px,4vw,40px)',
                  borderRadius: a ? 0 : '50%',
                  background: a ? 'linear-gradient(135deg,#ff6b00,#cc4400)' : 'linear-gradient(135deg,#ec4899,#be185d)',
                  boxShadow: a ? '0 0 15px rgba(255,107,0,0.8)' : '0 0 15px rgba(236,72,153,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 'clamp(12px,2.5vw,20px)', height: 'clamp(12px,2.5vw,20px)',
                    borderRadius: a ? 0 : '50%',
                    background: a ? '#ffcc99' : '#f9a8d4',
                  }} />
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 'clamp(-10px,-1.8vw,-14px)',
                  left: '50%', transform: 'translateX(-50%)',
                  width: 'clamp(6px,1vw,8px)', height: 'clamp(12px,2vw,20px)',
                  background: 'linear-gradient(to bottom,#d97706,#92400e)',
                  borderRadius: a ? 0 : '0 0 4px 4px',
                }} />
              </div>

              {/* PING-PONG klikalny */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button onClick={handlePingPongClick}
                  style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}>
                  <span style={{
                    display: 'block',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    fontSize: 'clamp(1.5rem, 5vw, 3rem)',
                    letterSpacing: a ? '0.05em' : '0.1em',
                    fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
                    lineHeight: a ? 1.5 : 1.2,
                    transition: 'all 0.3s',
                    ...(chaosMode
                      ? (a
                          ? { color: '#39ff14', textShadow: '0 0 20px #39ff14, 0 0 40px #39ff14',
                              animation: 'arcadeShake 0.3s infinite' }
                          : { color: '#fde047', animation: 'neonPulse 0.4s infinite, arcadeShake 0.3s infinite' })
                      : (a
                          ? { backgroundImage: 'linear-gradient(90deg,#ff6b00,#ffaa00,#39ff14)',
                              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
                          : { backgroundImage: 'linear-gradient(90deg,#ec4899,#a855f7,#22d3ee)',
                              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' })
                    ),
                  }}>
                    PING-PONG
                  </span>
                </button>

                {hint && !chaosMode && (
                  <div style={{
                    position: 'absolute', bottom: '-32px',
                    left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: a ? 0 : '9999px',
                    border: a ? '2px solid #176604' : '1px solid #155e75',
                    background: a ? '#010300' : 'rgba(0,0,0,0.8)',
                    color: a ? '#39ff14' : '#22d3ee',
                    fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
                    fontSize: a ? '0.42rem' : '0.75rem',
                    letterSpacing: a ? '0.05em' : 'normal',
                  }}>{hint}</div>
                )}

                {chaosMode && (
                  <div style={{
                    position: 'absolute', bottom: '-32px',
                    left: '50%', transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap', fontWeight: 900,
                    padding: '3px 12px',
                    borderRadius: a ? 0 : '9999px',
                    border: a ? '2px solid #ff6b00' : '2px solid #fbbf24',
                    background: a ? 'rgba(13,2,0,0.9)' : 'rgba(120,53,15,0.9)',
                    color: a ? '#ff6b00' : '#fde047',
                    textShadow: `0 0 10px ${a ? '#ff6b00' : '#ffd700'}`,
                    fontFamily: a ? "'Press Start 2P',monospace" : 'inherit',
                    fontSize: a ? '0.42rem' : '0.75rem',
                    boxShadow: a ? '0 0 15px rgba(255,107,0,0.5)' : '0 0 20px rgba(255,215,0,0.5)',
                  }}>{a ? '>>> CHAOS <<<' : '🎉 CHAOS MODE 🎉'}</div>
                )}
              </div>

              {/* Prawa rakietka */}
              <div style={{ position: 'relative', flexShrink: 0,
                transform: chaosMode ? 'rotate(-720deg) scale(1.5)' : 'rotate(45deg)',
                transition: 'transform 0.5s' }}>
                <div style={{
                  width: 'clamp(24px,4vw,40px)', height: 'clamp(24px,4vw,40px)',
                  borderRadius: a ? 0 : '50%',
                  background: a ? 'linear-gradient(135deg,#39ff14,#22880a)' : 'linear-gradient(135deg,#06b6d4,#0e7490)',
                  boxShadow: a ? '0 0 15px rgba(57,255,20,0.8)' : '0 0 15px rgba(34,211,238,0.8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 'clamp(12px,2.5vw,20px)', height: 'clamp(12px,2.5vw,20px)',
                    borderRadius: a ? 0 : '50%',
                    background: a ? '#b8ffb0' : '#67e8f9',
                  }} />
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 'clamp(-10px,-1.8vw,-14px)',
                  left: '50%', transform: 'translateX(-50%)',
                  width: 'clamp(6px,1vw,8px)', height: 'clamp(12px,2vw,20px)',
                  background: 'linear-gradient(to bottom,#d97706,#92400e)',
                  borderRadius: a ? 0 : '0 0 4px 4px',
                }} />
              </div>
            </div>
          </h1>

          {/* Loader bar */}
          <div style={{
            width: '100%', maxWidth: '28rem', height: '3px',
            background: a ? '#0a2200' : '#1f2937',
            borderRadius: a ? 0 : '9999px',
            overflow: 'hidden', marginTop: '2rem', marginBottom: '1rem',
          }}>
            <div className={chaosMode ? '' : 'animate-pulse'} style={{
              height: '100%', width: '100%',
              borderRadius: a ? 0 : '9999px',
              background: chaosMode
                ? (a ? 'linear-gradient(90deg,#ff6b00,#ffaa00,#ff6b00)' : 'linear-gradient(90deg,#fbbf24,#ef4444,#ec4899)')
                : (a ? 'linear-gradient(90deg,#39ff14,#b8ffb0,#39ff14)' : 'linear-gradient(90deg,#06b6d4,#a855f7,#ec4899)'),
              boxShadow: `0 0 8px ${a ? 'rgba(57,255,20,0.6)' : 'rgba(6,182,212,0.4)'}`,
            }} />
          </div>

          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
            flexWrap: 'wrap', justifyContent: 'center' }}>
            {a ? (
              <>
                <span style={{
                  fontFamily: "'Press Start 2P',monospace", fontSize: '0.44rem',
                  color: arcadeTick ? '#39ff14' : '#0a2200',
                  textShadow: arcadeTick ? '0 0 16px rgba(57,255,20,1), 0 0 30px rgba(57,255,20,0.4)' : 'none',
                  transition: 'color 0.08s, text-shadow 0.08s',
                  letterSpacing: '0.1em',
                }}>★ INSERT COIN ★</span>
                <span style={{ color: '#1a4d00', fontSize: '0.7rem' }}>│</span>
                <span style={{
                  fontFamily: "'Press Start 2P',monospace", fontSize: '0.4rem',
                  color: isConnected ? '#39ff14' : '#ff3300',
                  textShadow: isConnected ? '0 0 8px rgba(57,255,20,0.8)' : '0 0 8px rgba(255,51,0,0.8)',
                  letterSpacing: '0.05em',
                }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
              </>
            ) : (
              <>
                <span style={{ color: '#155e75', fontFamily: 'monospace', fontSize: '0.75rem' }}>V2.0</span>
                <span style={{ color: '#374151' }}>//</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={12} style={{ color: '#eab308' }} />
                  <span style={{ fontWeight: 'bold', fontSize: '0.75rem',
                    backgroundImage: 'linear-gradient(90deg,#22d3ee,#ec4899)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    CYBER PONK
                  </span>
                </span>
                <span style={{ color: '#be185d', fontWeight: 'bold', fontSize: '0.75rem' }}>×</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#f97316',
                  filter: 'drop-shadow(0 0 5px rgba(249,115,22,0.6))' }}>FIREHOST</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Separator */}
      <div style={{
        height: '1rem',
        background: a ? 'linear-gradient(to bottom,#010300,#020500)' : 'linear-gradient(to bottom,#111827,#030712)',
        borderBottom: a ? '1px solid #0d2900' : '1px solid rgba(22,78,99,0.3)',
      }}>
        <div style={{ height: '1px',
          background: a
            ? 'linear-gradient(90deg,transparent,rgba(57,255,20,0.4) 50%,transparent)'
            : 'linear-gradient(90deg,transparent,rgba(6,182,212,0.4) 50%,transparent)' }} />
      </div>
    </>
  );
}
