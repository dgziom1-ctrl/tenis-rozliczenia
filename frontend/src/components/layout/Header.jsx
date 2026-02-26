import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

const CLICKS_NEEDED = 5;
const LONG_PRESS_MS = 2000;

/* ══════════════════════════════════════════════
   ARCADE HEADER — looks like a real arcade cabinet
══════════════════════════════════════════════ */
function ArcadeHeader({ isMuted, setIsMuted, isConnected, onOpenPong, onCopyBlik, copied, blikNumber,
  clickCount, handlePingPongClick, hint, chaosMode, confetti,
  pressing, pressProgress, startLongPress, cancelLongPress }) {

  const [tick, setTick] = useState(true);
  const [credits] = useState(1);

  useEffect(() => {
    const t = setInterval(() => setTick(p => !p), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* Confetti */}
      {confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{ left: `${c.x}%`, top: '0px', fontSize: `${c.size}px`,
            animation: `fall ${c.dur}s ${c.delay}s ease-in forwards`,
            transform: `rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}

      <style>{`
        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity:1; }
          100% { transform: translateY(300px) rotate(720deg) scale(0.4); opacity:0; }
        }
        @keyframes scan {
          0%   { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes rgbShift {
          0%,100% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #00ffff; }
          50%      { text-shadow: -2px 0 0 #ff0000, 2px 0 0 #00ffff; }
        }
      `}</style>

      <div className="crt-screen relative overflow-hidden mb-0"
        style={{ background: '#010300', border: '4px solid #1a4d00', fontFamily: "'Press Start 2P', monospace" }}>

        {/* CRT scan line effect */}
        <div className="absolute w-full h-8 pointer-events-none z-10 opacity-10"
          style={{ background: 'linear-gradient(transparent, rgba(57,255,20,0.3), transparent)',
            animation: 'scan 4s linear infinite' }} />

        {/* ── MARQUEE TOP ──────────────────────────── */}
        <div className="overflow-hidden border-b-2 py-2"
          style={{ borderColor: '#1a4d00', background: '#000' }}>
          <div className="whitespace-nowrap"
            style={{ animation: 'marquee 14s linear infinite', display: 'inline-block' }}>
            {['★ CYBER PONK ★', '🏓 PING PONG CLUB 🏓', '★ HIGH SCORES ★', '🎮 INSERT COIN 🎮',
              '★ FAMILY ARCADE ★', '🏆 WHO PAID WHO ★'].map((t, i) => (
              <span key={i} className="mx-8 text-xs font-bold"
                style={{ color: i % 2 === 0 ? '#39ff14' : '#ff6b00' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── MAIN CABINET DISPLAY ─────────────────── */}
        <div className="p-4 text-center relative">

          {/* Corner decorations */}
          {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} text-xs`}
              style={{ color: '#1a4d00', fontFamily: "'Press Start 2P', monospace" }}>✛</div>
          ))}

          {/* Press Start / Logo */}
          <div className="mb-3">
            <div className="text-xs mb-1" style={{ color: '#176604', letterSpacing: '0.3em' }}>
              ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★
            </div>
            <div className="font-black mb-1" style={{
              fontSize: '1.3rem',
              color: '#39ff14',
              textShadow: '0 0 20px rgba(57,255,20,0.8), 0 0 40px rgba(57,255,20,0.4)',
              letterSpacing: '0.1em',
              animation: 'rgbShift 3s ease-in-out infinite',
            }}>
              CYBER PONK
            </div>
            <div className="text-xs" style={{ color: '#ff6b00', letterSpacing: '0.3em' }}>
              ─ PING PONG ROZLICZENIA ─
            </div>
          </div>

          {/* ASCII Pong */}
          <div className="ascii-pong-field my-3">
            <span className="paddle text-2xl font-bold">「</span>
            <div className="ball-court mx-4">
              <span className="ascii-ball text-xl animate-pulse">●</span>
            </div>
            <span className="paddle text-2xl font-bold">」</span>
          </div>

          {/* INSERT COIN / PRESS START */}
          <div className="my-3 text-sm font-bold" style={{
            color: tick ? '#ff6b00' : 'transparent',
            textShadow: tick ? '0 0 15px rgba(255,107,0,0.9)' : 'none',
            transition: 'color 0.1s, text-shadow 0.1s',
            letterSpacing: '0.15em',
          }}>
            ★ PRESS START ★
          </div>

          {/* Credits + Status */}
          <div className="flex justify-between items-center mt-2 px-2 text-xs"
            style={{ borderTop: '1px solid #0d2900', paddingTop: '8px', color: '#176604' }}>
            <span>CREDITS: {credits}</span>
            <span style={{ color: isConnected ? '#39ff14' : '#ff6b00' }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span>1UP</span>
          </div>
        </div>

        {/* ── BOTTOM BAR: BLIK + CONTROLS ──────────── */}
        <div className="flex items-center justify-between px-3 py-2 gap-2"
          style={{ background: '#000', borderTop: '2px solid #1a4d00' }}>

          {/* BLIK */}
          <button onClick={onCopyBlik}
            className="flex items-center gap-2 px-2 py-1 text-xs font-bold transition-all"
            style={{ border: '2px solid #176604', color: '#39ff14',
              background: copied ? '#0a2200' : 'transparent',
              fontFamily: "'Press Start 2P', monospace",
              boxShadow: copied ? '0 0 10px rgba(57,255,20,0.4)' : 'none' }}>
            <Smartphone size={12} style={{ color: '#ff6b00' }} />
            <span style={{ color: '#ff6b00', fontSize: '0.4rem' }}>BLIK</span>
            <span style={{ fontSize: '0.45rem' }}>{blikNumber}</span>
            {copied
              ? <Check size={10} style={{ color: '#39ff14' }} />
              : <Copy  size={10} style={{ color: '#176604' }} />}
          </button>

          {/* Long press logo → Pong */}
          <button
            onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
            onTouchStart={(e) => { e.preventDefault(); startLongPress(); }}
            onTouchEnd={cancelLongPress} onTouchCancel={cancelLongPress}
            className="relative select-none touch-none outline-none text-2xl"
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
          >
            {pressing && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="absolute w-10 h-10"
                  style={{ border: '2px solid #39ff14', borderRadius: 0,
                    animation: 'ripple 0.7s ease-out infinite' }} />
              </span>
            )}
            🕹️
          </button>

          {/* Mute */}
          <button onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center w-9 h-9 text-xs font-bold transition-all"
            style={{ border: `2px solid ${isMuted ? '#ff3300' : '#176604'}`,
              color: isMuted ? '#ff3300' : '#39ff14',
              background: 'transparent',
              fontFamily: "'Press Start 2P', monospace" }}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Long press progress bar */}
        {pressing && (
          <div style={{ height: '3px', background: '#0d2900' }}>
            <div style={{ height: '100%', background: '#39ff14',
              width: `${pressProgress}%`, transition: 'none',
              boxShadow: '0 0 8px rgba(57,255,20,0.8)' }} />
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   CYBER PONK HEADER (original)
══════════════════════════════════════════════ */
function CyberHeader({ isMuted, setIsMuted, isConnected, onCopyBlik, copied, blikNumber,
  clickCount, handlePingPongClick, hint, chaosMode, confetti,
  pressing, pressProgress, startLongPress, cancelLongPress }) {

  return (
    <>
      {confetti.map(c => (
        <div key={c.id} className="absolute pointer-events-none z-30"
          style={{ left: `${c.x}%`, top: '-10px', fontSize: `${c.size}px`,
            animation: `fall ${c.dur}s ${c.delay}s ease-in forwards`,
            transform: `rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}

      <style>{`
        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity:1; }
          100% { transform: translateY(220px) rotate(720deg) scale(0.5); opacity:0; }
        }
        @keyframes neonPulse {
          0%,100% { text-shadow: 0 0 10px #ff0080, 0 0 20px #ff0080; }
          50%      { text-shadow: 0 0 20px #00d4ff, 0 0 40px #00d4ff; }
        }
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%     { transform:translateX(-6px) rotate(-2deg); }
          40%     { transform:translateX(6px) rotate(2deg); }
          60%     { transform:translateX(-4px); }
          80%     { transform:translateX(4px); }
        }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity:0.7; }
          100% { transform: scale(2.2); opacity:0; }
        }
      `}</style>

      {/* GÓRNY PASEK */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/50 bg-black/40 backdrop-blur-sm">
        <button onClick={onCopyBlik}
          className="group flex items-center gap-2 px-3 py-2 border border-cyan-600/60 rounded-lg bg-black/60 hover:bg-cyan-950/60 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300">
          <Smartphone size={18} className="text-cyan-500 group-hover:text-cyan-300" />
          <span className="text-xs font-black tracking-[0.2em] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)] px-1.5 py-0.5 bg-yellow-400/10 rounded">BLIK</span>
          <span className="text-sm font-mono font-bold tracking-wider text-cyan-300">{blikNumber}</span>
          <div className="w-px h-4 bg-cyan-700/50 mx-1" />
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-cyan-500/50 group-hover:text-cyan-300" />}
        </button>
        <button onClick={() => setIsMuted(!isMuted)}
          className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] ${isMuted ? 'border-red-500/60 bg-red-950/30 text-red-400' : 'border-cyan-600/60 bg-black/60 text-cyan-400 hover:bg-cyan-950/40'}`}>
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      {/* SEKCJA GŁÓWNA */}
      <div className="px-4 py-8 flex flex-col items-center">
        {/* Logo — long press → Pong */}
        <div className="relative flex flex-col items-center mb-2">
          <button
            onMouseDown={startLongPress} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
            onTouchStart={(e) => { e.preventDefault(); startLongPress(); }}
            onTouchEnd={cancelLongPress} onTouchCancel={cancelLongPress}
            className={`relative text-4xl outline-none select-none touch-none transition-transform duration-200 ${pressing ? 'scale-110' : 'hover:scale-105'}`}
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
            {pressing && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="absolute w-10 h-10 rounded-full border-2 border-cyan-400 opacity-70" style={{ animation: 'ripple 0.7s ease-out infinite' }} />
                <span className="absolute w-10 h-10 rounded-full border-2 border-cyan-400 opacity-40" style={{ animation: 'ripple 0.7s ease-out 0.3s infinite' }} />
              </span>
            )}
            🕹️
          </button>
          <div className={`overflow-hidden rounded-full transition-all duration-200 ${pressing ? 'w-14 h-1 mt-2' : 'w-0 h-0'} bg-cyan-900/50`}>
            <div className="h-full bg-cyan-400 rounded-full transition-none" style={{ width: `${pressProgress}%` }} />
          </div>
        </div>

        {/* ASCII Pong */}
        <div className="ascii-pong-field mb-4">
          <span className="paddle text-2xl font-bold drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">「</span>
          <div className="ball-court mx-4"><span className="ascii-ball text-xl animate-pulse">●</span></div>
          <span className="paddle text-2xl font-bold drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">」</span>
        </div>

        {/* Tytuł */}
        <h1 className="text-center mb-4 w-full">
          <span className="block text-2xl sm:text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-400 to-white uppercase italic">
            CENTRUM DOWODZENIA
          </span>
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-2 flex-nowrap">
            <div className={`relative flex-shrink-0 transition-all duration-500 ${chaosMode ? 'rotate-[720deg] scale-150' : '-rotate-45 hover:rotate-0'}`}>
              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 shadow-[0_0_15px_rgba(236,72,153,0.8)] flex items-center justify-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-pink-300" />
              </div>
              <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-3 sm:h-4 md:h-5 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-full" />
            </div>

            <div className="relative flex flex-col items-center">
              <button onClick={handlePingPongClick}
                className="relative group cursor-pointer select-none border-0 bg-transparent p-0 m-0">
                <span className={`block text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wider sm:tracking-widest whitespace-nowrap transition-all duration-300 ${chaosMode ? 'text-yellow-300' : 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400'}`}
                  style={chaosMode ? { animation: 'neonPulse 0.4s infinite, shake 0.3s infinite' } : {}}>
                  PING-PONG
                </span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-cyan-400 group-hover:w-full transition-all duration-300 rounded-full" />
              </button>
              {hint && !chaosMode && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-black px-3 py-1 rounded-full border border-cyan-700 bg-black/80 text-cyan-400 animate-bounce">{hint}</div>
              )}
              {chaosMode && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-black px-4 py-1 rounded-full border-2 border-yellow-400 bg-yellow-950/90 text-yellow-300 shadow-[0_0_20px_#ffd700]">🎉 CHAOS MODE 🎉</div>
              )}
            </div>

            <div className={`relative flex-shrink-0 transition-all duration-500 ${chaosMode ? 'rotate-[-720deg] scale-150' : 'rotate-45 hover:rotate-0'}`}>
              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-[0_0_15px_rgba(34,211,238,0.8)] flex items-center justify-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-cyan-300" />
              </div>
              <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-3 sm:h-4 md:h-5 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-full" />
            </div>
          </div>
        </h1>

        {/* Loader bar */}
        <div className="w-full max-w-md h-1 bg-gray-800 rounded-full overflow-hidden mt-8 mb-4">
          <div className={`h-full rounded-full ${chaosMode ? 'bg-gradient-to-r from-yellow-400 via-red-400 to-pink-400' : 'animate-pulse bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500'}`} style={{ width: '100%' }} />
        </div>

        {/* Branding */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs tracking-widest flex-wrap justify-center">
          <span className="text-cyan-600 font-mono">V2.0</span>
          <span className="text-gray-600">//</span>
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-yellow-500" />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">CYBER PONK</span>
          </div>
          <span className="text-pink-600 font-bold">×</span>
          <span className="font-bold text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.6)]">FIREHOST</span>
        </div>
      </div>

      <div className="absolute top-0 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)' }} />
    </>
  );
}

/* ══════════════════════════════════════════════
   MAIN EXPORT — shared state, picks which header
══════════════════════════════════════════════ */
export default function Header({ isMuted, setIsMuted, isConnected, onOpenPong, theme, onToggleTheme }) {
  const [copied,        setCopied]        = useState(false);
  const [clickCount,    setClickCount]    = useState(0);
  const [chaosMode,     setChaosMode]     = useState(false);
  const [hint,          setHint]          = useState('');
  const [confetti,      setConfetti]      = useState([]);
  const [pressing,      setPressing]      = useState(false);
  const [pressProgress, setPressProgress] = useState(0);

  const resetTimer       = useRef(null);
  const chaosTimer       = useRef(null);
  const longPressTimer   = useRef(null);
  const progressInterval = useRef(null);

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  const onCopyBlik = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePingPongClick = () => {
    clearTimeout(resetTimer.current);
    setClickCount(prev => {
      const next = prev + 1;
      if (next >= CLICKS_NEEDED) { activateChaos(); return 0; }
      const hints = ['', '🏓', '🏓🏓', '🏓🏓🏓 coś tu jest...', '🏓🏓🏓🏓 jeszcze raz!'];
      setHint(hints[next]);
      resetTimer.current = setTimeout(() => { setClickCount(0); setHint(''); }, 2000);
      return next;
    });
  };

  const activateChaos = () => {
    setHint('');
    setChaosMode(true);
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji:  ['🏓','🏓','⚡','🎱','💥','🌀','🎉','✨'][Math.floor(Math.random() * 8)],
      x:      Math.random() * 100, delay: Math.random() * 0.8,
      dur:    1 + Math.random() * 1.5, size: 16 + Math.random() * 20,
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
  }, []);

  const shared = {
    isMuted, setIsMuted, isConnected, onOpenPong,
    onCopyBlik, copied, blikNumber,
    clickCount, handlePingPongClick, hint, chaosMode, confetti,
    pressing, pressProgress, startLongPress, cancelLongPress,
  };

  const isArcade = theme === 'arcade';

  return (
    <>
      <div className={`relative overflow-hidden mb-0 transition-all duration-300 ${isArcade ? '' : 'rounded-t-2xl bg-gradient-to-b from-black via-gray-950 to-gray-900'}`}>
        {isArcade
          ? <ArcadeHeader {...shared} />
          : <CyberHeader  {...shared} />
        }
      </div>
      {!isArcade && (
        <div className="h-4 bg-gradient-to-b from-gray-900 to-gray-950 border-b border-cyan-900/30">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        </div>
      )}
    </>
  );
}
