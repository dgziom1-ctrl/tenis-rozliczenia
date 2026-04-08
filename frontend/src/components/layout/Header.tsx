import { Volume2, VolumeX, Smartphone, Check, Sun, Moon } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ArenaCanvas from './ArenaCanvas';


/* ═══════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════ */
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ color:'var(--co-dim)' }}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

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
  const [confetti,  setConfetti]  = useState([]);
  const [hitting,   setHitting]   = useState(false);
  const chaosTimer = useRef(null);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';

  useEffect(() => {
    return () => {
      clearTimeout(chaosTimer.current);
      clearTimeout(clickTimer.current);
    };
  }, []);

  /* Stable callback — avoids re-mounting canvas on every render */
  const handleHit = useCallback((state) => {
    setHitting(state);
    if (state) window.dispatchEvent(new CustomEvent('paddleHit'));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleTitleClick = () => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
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
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  return (
    <>
      {chaosMode && confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{ left:`${c.x}%`,top:0,fontSize:`${c.size}px`,
            animation:`confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift':`${c.drift}px`,transform:`rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex:49,
          animation:'chaosFlash 0.6s ease-out forwards',
          background:'radial-gradient(ellipse at 50% 30%,rgba(0,229,255,0.12) 0%,rgba(0,229,255,0.04) 60%,transparent 80%)' }}/>
      )}

      <header style={{ position:'relative',overflow:'visible',
        background:'linear-gradient(180deg,#020408 0%,#050B10 100%)',
        borderBottom:'1px solid var(--co-border)' }}>

        <div style={{ position:'absolute',top:0,left:0,width:80,height:2,background:'var(--co-cyan)',boxShadow:'0 0 10px rgba(0,229,255,.7)',zIndex:2 }}/>
        <div style={{ position:'absolute',top:0,right:0,width:80,height:2,background:'var(--co-cyan)',boxShadow:'0 0 10px rgba(0,229,255,.7)',zIndex:2 }}/>
        <div style={{ position:'absolute',top:0,left:0,width:2,height:52,background:'linear-gradient(to bottom,rgba(0,229,255,0.9),transparent)',zIndex:2 }}/>
        <div style={{ position:'absolute',top:0,right:0,width:2,height:52,background:'linear-gradient(to bottom,rgba(0,229,255,0.6),transparent)',zIndex:2 }}/>

        <div style={{ position:'relative',zIndex:10,display:'flex',alignItems:'center',
          justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--co-separator)' }}>
          <button onClick={handleCopy} style={{ display:'flex',alignItems:'center',gap:'8px',
            background:'var(--co-dark)',border:'1px solid var(--co-border)',padding:'7px 12px',cursor:'pointer',
            transition:'all .18s',clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
            <Smartphone size={14} style={{ color:'var(--co-dim)' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.7rem',fontWeight:400,
              letterSpacing:'.18em',color:'var(--co-cyan)',padding:'2px 6px',
              background:'rgba(0,229,255,0.07)',border:'1px solid rgba(0,229,255,.22)' }}>BLIK</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:'.9rem',letterSpacing:'.06em',color:'var(--co-text)' }}>
              {blikNumber}
            </span>
            <div style={{ width:1,height:14,background:'var(--co-border)',margin:'0 2px' }}/>
            {copied ? <Check size={13} style={{ color:'var(--co-green)' }}/> : <CopyIcon/>}
          </button>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <button onClick={() => setIsMuted(!isMuted)} style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'all .18s',
              border:isMuted?'1px solid rgba(255,32,144,.5)':'1px solid var(--co-border)',
              color:isMuted?'#FF4444':'var(--co-dim)',
              background:isMuted?'rgba(255,68,68,.08)':'transparent',
              clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
              {isMuted ? <VolumeX size={17}/> : <Volume2 size={17}/>}
            </button>
            <button onClick={onToggleTheme} style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'all .18s',
              border:'1px solid var(--co-border)',color:'var(--co-dim)',background:'transparent',
              clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
              {theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}
            </button>
          </div>
        </div>

        <div style={{ position:'relative',zIndex:10,padding:'18px 16px 22px',
          display:'flex',flexDirection:'column',alignItems:'center' }}>

          <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px' }}>
            <div style={{ height:1,width:36,background:'linear-gradient(to right,transparent,rgba(0,229,255,.4))' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.7rem',fontWeight:400,
              letterSpacing:'.28em',color:'rgba(0,229,255,0.45)',textTransform:'uppercase' }}>
              CENTRUM DOWODZENIA
            </span>
            <div style={{ height:1,width:36,background:'linear-gradient(to left,transparent,rgba(0,229,255,.4))' }}/>
          </div>

          <div style={{ width:'100%',maxWidth:560,marginBottom:14,
            overflow:'visible',
            filter:chaosMode?'none':'drop-shadow(0 0 20px rgba(0,229,255,.12))' }}>
            <ArenaCanvas chaosMode={chaosMode} onHit={handleHit}/>
          </div>

          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background:'transparent',border:'none',padding:0,cursor:'pointer',position:'relative' }}>
            {/* Ghost layer — glitch fires on paddle hit, just like JACK IN */}
            {!chaosMode && hitting && <span aria-hidden="true" style={{
              position:'absolute',inset:0,
              display:'block',fontFamily:'var(--font-display)',fontWeight:900,
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:'.06em',lineHeight:1,textAlign:'center',
              color:'transparent',pointerEvents:'none',userSelect:'none',
              textShadow:'-4px 0 #FF2090, 4px 0 var(--co-cyan)',
              clipPath:'polygon(0 20%, 100% 20%, 100% 52%, 0 52%)',
              opacity:1,
            }}>CYBER-PONK</span>}
            {/* Main title — glitch on hit */}
            <span style={{
              display:'block',fontFamily:'var(--font-display)',fontWeight:900,
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:'.06em',lineHeight:1,textAlign:'center',
              position:'relative',
              transition:'text-shadow 0.06s, transform 0.06s',
              ...(chaosMode
                ? { color:'#00E5FF',animation:'headerBounce .4s ease-in-out 3',
                    textShadow:'0 0 30px rgba(0,229,255,.8),0 0 60px rgba(0,229,255,.3),2px 2px 0 rgba(0,0,0,.9)' }
                : hitting
                ? { color:'#E0F4FF',
                    textShadow:'0 0 28px rgba(0,229,255,.9),0 0 60px rgba(0,229,255,.4),3px 0 #FF2090,-3px 0 var(--co-cyan)',
                    transform:'translateX(1px)' }
                : { color:'#B8E0EE',
                    textShadow:'0 0 20px rgba(0,229,255,.25),2px 2px 0 rgba(0,0,0,.98)',
                }),
            }}>CYBER-PONK</span>
          </button>

          <div style={{ width:'100%',maxWidth:'22rem',height:1,margin:'14px 0 10px',
            background:'linear-gradient(90deg,transparent,rgba(0,229,255,.25) 40%,rgba(0,229,255,.25) 60%,transparent)' }}/>

          {/* JACK IN — lights up exactly when ball hits paddle */}
          <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
            <span style={{
              fontFamily:'var(--font-display)',fontSize:'.7rem',fontWeight:400,
              letterSpacing:'.2em',textTransform:'uppercase',
              transition:'color .06s,text-shadow .06s',
              color:    hitting ? 'var(--co-cyan)' : 'rgba(0,229,255,0.08)',
              textShadow: hitting ? '0 0 12px rgba(0,229,255,.8)' : 'none',
            }}>⚡ JACK IN ⚡</span>
            <span style={{ color:'var(--co-border)' }}>│</span>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.7rem',fontWeight:400,
              letterSpacing:'.1em',
              color:isConnected?'var(--co-green)':'#FF3333',
              textShadow:isConnected?'0 0 8px rgba(0,255,136,0.5)':'0 0 8px rgba(255,50,50,0.5)' }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color:'var(--co-border)' }}>│</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:'.68rem',color:'var(--co-dim)' }}>
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
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.7rem',fontWeight:400,
            letterSpacing:'.15em',color:'var(--co-cyan)',padding:'2px 5px',
            background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,.2)' }}>BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)',color:'var(--co-text)',fontSize:'.85rem',letterSpacing:'.06em' }}>
            {blikNumber}
          </span>
          {copied ? <Check size={12} style={{ color:'var(--co-green)' }}/> : <CopyIcon/>}
        </button>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.7rem',fontWeight:400,
            letterSpacing:'.08em',color:isConnected?'var(--co-green)':'#FF3333' }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
          <button onClick={() => setIsMuted(!isMuted)} style={{ display:'flex',alignItems:'center',
            border:isMuted?'1px solid rgba(255,32,144,.4)':'1px solid var(--co-border)',
            color:isMuted?'var(--co-rose)':'var(--co-dim)',
            background:'transparent',padding:'4px 6px',cursor:'pointer',
            clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>
            {isMuted ? <VolumeX size={15}/> : <Volume2 size={15}/>}
          </button>
          <button onClick={onToggleTheme} style={{ display:'flex',alignItems:'center',
            border:'1px solid var(--co-border)',color:'var(--co-dim)',
            background:'transparent',padding:'4px 6px',cursor:'pointer',
            clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>
            {theme === 'light' ? <Moon size={15}/> : <Sun size={15}/>}
          </button>
        </div>
      </div>
    </>
  );
}

export default React.memo(Header);