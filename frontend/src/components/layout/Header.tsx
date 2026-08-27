import { Volume2, VolumeX, Smartphone, Check, Sun, Moon } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ArenaCanvas from './ArenaCanvas';
import { copyToClipboard } from '@/utils/clipboard';
import { useToast } from '@/components/common/Toast';
import { TEXT, TRACK, CLIP } from '@/constants/styles';
import type { StyleWithVars } from '@/types/css';


/* ═══════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════ */
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false"
    style={{ color:'var(--co-dim)' }}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

interface ChaosConfettiPiece {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  dur: number;
  size: number;
  rotate: number;
  drift: number;
}

interface HeaderProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isConnected: boolean;
  scrolled: boolean;
  theme: string;
  onToggleTheme: () => void;
}

function Header({ isMuted, setIsMuted, isConnected, scrolled, theme, onToggleTheme }: HeaderProps) {
  const [copied,    setCopied]    = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti,  setConfetti]  = useState<ChaosConfettiPiece[]>([]);
  const [hitting,   setHitting]   = useState(false);
  const chaosTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showError } = useToast();

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  useEffect(() => {
    return () => {
      clearTimeout(chaosTimer.current ?? undefined);
      clearTimeout(clickTimer.current ?? undefined);
    };
  }, []);

  /* Stable callback — avoids re-mounting canvas on every render */
  const handleHit = useCallback((state: boolean) => {
    setHitting(state);
    if (state) window.dispatchEvent(new CustomEvent('paddleHit'));
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(blikNumber.replace(/\s/g, ''));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      showError('Nie udało się skopiować numeru BLIK');
    }
  };

  const handleTitleClick = () => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current ?? undefined);
    if (clickCount.current >= 5) { clickCount.current = 0; activateChaos(); }
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
  };

  const activateChaos = () => {
    setChaosMode(true);
    const pool = ['🏓','⚡','💀','🎮','💥','⚠️','🔥','🎯','💣','🌊'];
    setConfetti(Array.from({ length: 40 }, (_, i) => ({
      id: i, emoji: pool[Math.floor(Math.random() * pool.length)],
      x: Math.random()*100, delay: Math.random()*1.2,
      dur: 1.8+Math.random()*1.5, size: 18+Math.random()*24,
      rotate: Math.random()*360, drift: (Math.random()-.5)*120,
    })));
    clearTimeout(chaosTimer.current ?? undefined);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  return (
    <>
      {chaosMode && confetti.map(c => {
        const style: StyleWithVars = { left:`${c.x}%`,top:0,fontSize:`${c.size}px`,
          animation:`confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
          '--drift':`${c.drift}px`,transform:`rotate(${c.rotate}deg)` };
        return (
          <div key={c.id} className="fixed pointer-events-none z-50" style={style}>
            {c.emoji}
          </div>
        );
      })}
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex:49,
          animation:'chaosFlash 0.6s ease-out forwards',
          background:'radial-gradient(ellipse at 50% 30%,var(--co-tint-hi) 0%,var(--co-tint) 60%,transparent 80%)' }}/>
      )}

      <header style={{ position:'relative',overflow:'visible',
        background:'linear-gradient(180deg, var(--co-void) 0%, var(--co-dark) 100%)',
        borderBottom:'1px solid var(--co-border)' }}>

        <div aria-hidden="true" style={{ position:'absolute',top:0,left:0,width:80,height:2,background:'var(--co-cyan)',boxShadow:'var(--glow-box-cyan)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,right:0,width:80,height:2,background:'var(--co-cyan)',boxShadow:'var(--glow-box-cyan)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,left:0,width:2,height:52,background:'linear-gradient(to bottom,var(--co-cyan),transparent)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,right:0,width:2,height:52,background:'linear-gradient(to bottom,var(--co-cyan),transparent)',zIndex:2 }}/>

        <div style={{ position:'relative',zIndex:10,display:'flex',alignItems:'center',
          justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--co-separator)' }}>
          <button onClick={handleCopy} style={{ display:'flex',alignItems:'center',gap:'8px',
            background:'var(--co-dark)',border:'1px solid var(--co-border)',padding: '6px 12px',cursor:'pointer',
            transition:'all .18s',clipPath:CLIP.tag }}>
            <Smartphone size={14} style={{ color:'var(--co-dim)' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
              letterSpacing:TRACK.wide,color:'var(--co-cyan)',padding:'2px 6px',
              background:'var(--co-tint)',border:'1px solid var(--co-tint-line)' }}>BLIK</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:TEXT.base,letterSpacing:TRACK.tight,color:'var(--co-text)' }}>
              {blikNumber}
            </span>
            <div style={{ width:1,height:14,background:'var(--co-border)',margin:'0 2px' }}/>
            {copied ? <Check size={13} style={{ color:'var(--co-green)' }}/> : <CopyIcon/>}
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <button onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? 'Włącz dźwięki' : 'Wycisz dźwięki'} aria-pressed={isMuted}
              style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'all .18s',
              border:isMuted?'1px solid var(--co-rose)':'1px solid var(--co-border)',
              color:isMuted?'var(--co-rose)':'var(--co-dim)',
              background:isMuted?'var(--co-tint-rose)':'transparent',
              clipPath:CLIP.badge }}>
              {isMuted ? <VolumeX size={17} aria-hidden="true"/> : <Volume2 size={17} aria-hidden="true"/>}
            </button>
            <button onClick={onToggleTheme}
              aria-label={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
              style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'all .18s',
              border:'1px solid var(--co-border)',color:'var(--co-dim)',background:'transparent',
              clipPath:CLIP.badge }}>
              {theme === 'light' ? <Moon size={17} aria-hidden="true"/> : <Sun size={17} aria-hidden="true"/>}
            </button>
          </div>
        </div>

        <div style={{ position:'relative',zIndex:10,padding: '16px 16px 20px',
          display:'flex',flexDirection:'column',alignItems:'center' }}>

          <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px' }}>
            <div aria-hidden="true" style={{ height:1,width:36,background:'linear-gradient(to right,transparent,var(--co-tint-line))' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
              letterSpacing:TRACK.wide,color:'var(--co-dim)',textTransform:'uppercase' }}>
              CENTRUM DOWODZENIA
            </span>
            <div aria-hidden="true" style={{ height:1,width:36,background:'linear-gradient(to left,transparent,var(--co-tint-line))' }}/>
          </div>

          <div style={{ width:'100%',maxWidth:560,marginBottom:14,
            filter:chaosMode?'none':'var(--glow-drop-cyan)' }}>
            <ArenaCanvas chaosMode={chaosMode} lightMode={theme==='light'} onHit={handleHit}/>
          </div>

          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background:'transparent',border:'none',padding:0,cursor:'pointer',position:'relative' }}>
            {/* Ghost layer — glitch fires on paddle hit, just like JACK IN */}
            {!chaosMode && hitting && <span aria-hidden="true" style={{
              position:'absolute',inset:0,
              display:'block',fontFamily:'var(--font-display)',
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:TRACK.tight,lineHeight:1,textAlign:'center',
              color:'transparent',pointerEvents:'none',userSelect:'none',
              textShadow:'-4px 0 var(--co-rose), 4px 0 var(--co-cyan)',
              clipPath:'polygon(0 20%, 100% 20%, 100% 52%, 0 52%)',
              opacity:1,
            }}>CYBER-PONK</span>}
            <span style={{
              display:'block',fontFamily:'var(--font-display)',
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:TRACK.tight,lineHeight:1,textAlign:'center',
              position:'relative',
              transition:'text-shadow 0.06s, transform 0.06s',
              ...(chaosMode
                ? { color:'var(--co-cyan)',animation:'headerBounce .4s ease-in-out 3',
                    textShadow:'var(--glow-brand-lg)' }
                : hitting
                ? { color:'var(--co-cyan)',
                    textShadow:'var(--glow-brand-lg)',
                    transform:'translateX(1px)' }
                : { color:'var(--co-cyan)',
                    textShadow:'var(--glow-brand-sm)',
                  }),
            }}>CYBER-PONK</span>
          </button>

          <div style={{ width:'100%',maxWidth:'22rem',height:1,margin:'14px 0 10px',
            background:'linear-gradient(90deg,transparent,var(--co-tint-line) 40%,var(--co-tint-line) 60%,transparent)' }}/>

          {/* JACK IN — lights up exactly when ball hits paddle */}
          <div style={{ display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap',justifyContent:'center' }}>
            <span style={{
              fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
              letterSpacing:TRACK.wide,textTransform:'uppercase',
              transition:'color .06s,text-shadow .06s',
              // Wygaszony stan był cyanem na 8% krycia, czyli praktycznie
              // niewidoczny w obu motywach.
              color: hitting ? 'var(--co-cyan)' : 'var(--co-dim2)',
              textShadow: hitting ? 'var(--glow-cyan-md)' : 'none',
            }}>⚡ JACK IN ⚡</span>
            <span aria-hidden="true" style={{ color:'var(--co-border)' }}>│</span>
            <span style={{ fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
              letterSpacing:TRACK.normal,
              color:isConnected?'var(--co-green)':'var(--co-rose)',
              textShadow:isConnected?'var(--glow-green-md)':'var(--glow-rose-md)' }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span aria-hidden="true" style={{ color:'var(--co-border)' }}>│</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:TEXT.tiny,color:'var(--co-dim)' }}>
              v2.0.77
            </span>
          </div>
        </div>
      </header>

      <div style={{ height:2,background:'linear-gradient(90deg,transparent,var(--co-cyan) 50%,transparent)',opacity:.6 }}/>

      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{ background:'transparent',border:'none',padding:0,
          cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
          <Smartphone size={14} style={{ color:'var(--co-dim)' }}/>
          <span style={{ fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
            letterSpacing:TRACK.normal,color:'var(--co-cyan)',padding: '2px 4px',
            background:'var(--co-tint)',border:'1px solid var(--co-tint-line)' }}>BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)',color:'var(--co-text)',fontSize:TEXT.small,letterSpacing:TRACK.tight }}>
            {blikNumber}
          </span>
          {copied ? <Check size={12} style={{ color:'var(--co-green)' }}/> : <CopyIcon/>}
        </button>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <span style={{ fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
            letterSpacing:TRACK.tight,color:isConnected?'var(--co-green)':'var(--co-rose)' }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
          <button onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? 'Włącz dźwięki' : 'Wycisz dźwięki'} aria-pressed={isMuted}
            style={{ display:'flex',alignItems:'center',
            border:isMuted?'1px solid var(--co-rose)':'1px solid var(--co-border)',
            color:isMuted?'var(--co-rose)':'var(--co-dim)',
            background:'transparent',cursor:'pointer',
            justifyContent:'center',width:40,height:40,
            clipPath:CLIP.badge }}>
            {isMuted ? <VolumeX size={16} aria-hidden="true"/> : <Volume2 size={16} aria-hidden="true"/>}
          </button>
          <button onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
            style={{ display:'flex',alignItems:'center',
            border:'1px solid var(--co-border)',color:'var(--co-dim)',
            background:'transparent',cursor:'pointer',
            justifyContent:'center',width:40,height:40,
            clipPath:CLIP.badge }}>
            {theme === 'light' ? <Moon size={16} aria-hidden="true"/> : <Sun size={16} aria-hidden="true"/>}
          </button>
        </div>
      </div>
    </>
  );
}

export default React.memo(Header);