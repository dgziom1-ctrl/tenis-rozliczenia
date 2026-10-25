import { Volume2, VolumeX, Smartphone, Check, Sun, Moon, HelpCircle, Zap } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ArenaCanvas from './ArenaCanvas';
import { copyToClipboard } from '@/utils/clipboard';
import { BLIK_NUMBER } from '@/utils/blik';
import { useToast } from '@/components/common/Toast';
import { TEXT, TRACK, CLIP } from '@/constants/styles';
import { DEMO_MODE } from '@/constants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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
  /** Pozycja pozioma w % szerokości ekranu. */
  x: number;
  /** Pozycja pionowa — używana tylko w wariancie bez ruchu. */
  y: number;
  delay: number;
  dur: number;
  size: number;
  /** Obrót w stopniach — animacja nadpisuje `transform`, więc jedzie zmienną. */
  spin: number;
  drift: number;
}

/**
 * Ile kliknięć w tytuł uruchamia niespodziankę i ile wolno czekać między nimi.
 * Trzymane razem, bo zmiana jednej liczby bez drugiej zmienia próg trudności.
 */
const CHAOS_CLICKS = 5;
const CHAOS_CLICK_WINDOW_MS = 2000;

/**
 * Czas życia efektu. Musi pokryć najdłuższy kawałek konfetti
 * (maks. opóźnienie 0,9 s + maks. czas 2,6 s) z zapasem na wygaszenie.
 */
const CHAOS_DURATION_MS = 4000;

/** Co leci z góry. Dekoracja, nie ikona interfejsu — emoji jest tu treścią. */
const CHAOS_EMOJI = ['🏓', '⚡', '💀', '🎮', '💥', '🔥', '🎯', '💣', '🌊', '👑'];

interface HeaderProps {
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isConnected: boolean;
  scrolled: boolean;
  theme: string;
  onToggleTheme: () => void;
  onShowGuide: () => void;
}

function Header({ isMuted, setIsMuted, isConnected, scrolled, theme, onToggleTheme, onShowGuide }: HeaderProps) {
  const [copied,    setCopied]    = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti,  setConfetti]  = useState<ChaosConfettiPiece[]>([]);
  /**
   * Numer uruchomienia. Ten sam zestaw kawałków (id 0–43) w kolejnym odpaleniu
   * dostawał te same klucze Reacta, więc węzły były tylko aktualizowane —
   * a animacja z `forwards` stała już na końcu i konfetti nie ruszało się
   * z miejsca. Numer w kluczu wymusza nowe węzły, czyli start od zera.
   */
  const [chaosRun,  setChaosRun]  = useState(0);
  const [hitting,   setHitting]   = useState(false);
  const reducedMotion = useReducedMotion();
  const chaosTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showError } = useToast();

  const blikNumber = BLIK_NUMBER;

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
    if (clickCount.current >= CHAOS_CLICKS) { clickCount.current = 0; activateChaos(); }
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, CHAOS_CLICK_WINDOW_MS);
  };

  const activateChaos = () => {
    setChaosMode(true);
    setChaosRun(run => run + 1);
    setConfetti(Array.from({ length: 44 }, (_, i) => ({
      id: i,
      emoji: CHAOS_EMOJI[Math.floor(Math.random() * CHAOS_EMOJI.length)],
      x: Math.random() * 100,
      y: 6 + Math.random() * 80,
      delay: Math.random() * 0.9,
      dur: 1.6 + Math.random() * 1.0,
      size: 16 + Math.random() * 22,
      spin: 180 + Math.random() * 540,
      drift: (Math.random() - 0.5) * 160,
    })));
    clearTimeout(chaosTimer.current ?? undefined);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, CHAOS_DURATION_MS);
  };

  return (
    <>
      {chaosMode && (
        // Jedna warstwa na cały efekt: `position: fixed` + `overflow: hidden`.
        // Wcześniej każdy kawałek był osobnym `fixed` bez klucza animacji
        // (`confettiBurst` nie istniało w arkuszu), więc 40 emoji zostawało
        // w górnej krawędzi na całe 4 sekundy.
        <div className="chaos-layer" aria-hidden="true">
          {!reducedMotion && <div className="chaos-flash" />}
          {confetti.map(piece => {
            // Bez ruchu: statyczna posypka na tym samym obszarze zamiast
            // spadającego konfetti (prefers-reduced-motion).
            if (reducedMotion) {
              return (
                <span
                  key={`${chaosRun}-${piece.id}`}
                  className="chaos-piece chaos-piece-static"
                  style={{ left: `${piece.x}%`, top: `${piece.y}%`, fontSize: `${piece.size}px` }}
                >
                  {piece.emoji}
                </span>
              );
            }
            const style: StyleWithVars = {
              left: `${piece.x}%`,
              top: 0,
              fontSize: `${piece.size}px`,
              animation: `confettiBurst ${piece.dur}s ${piece.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
              '--drift': `${piece.drift}px`,
              '--spin': `${piece.spin}deg`,
            };
            return (
              <span key={`${chaosRun}-${piece.id}`} className="chaos-piece" style={style}>
                {piece.emoji}
              </span>
            );
          })}
        </div>
      )}

      <header className="glass-header" style={{ position:'relative',overflow:'visible' }}>

        <div aria-hidden="true" style={{ position:'absolute',top:0,left:0,right:0,height:1,
          background:'linear-gradient(90deg, transparent, var(--glass-hi-line), transparent)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,left:0,width:80,height:2,background:'var(--co-cyan)',boxShadow:'var(--glow-box-cyan)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,right:0,width:80,height:2,background:'var(--co-cyan)',boxShadow:'var(--glow-box-cyan)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,left:0,width:2,height:52,background:'linear-gradient(to bottom,var(--co-cyan),transparent)',zIndex:2 }}/>
        <div aria-hidden="true" style={{ position:'absolute',top:0,right:0,width:2,height:52,background:'linear-gradient(to bottom,var(--co-cyan),transparent)',zIndex:2 }}/>

        <div className="header-topbar" style={{ position:'relative',zIndex:10,display:'flex',alignItems:'center',
          justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--co-separator)' }}>
          <span className="header-wordmark">CYBER-PONK</span>
          <button type="button" onClick={handleCopy} className="glass-chip header-blik" aria-label={`Skopiuj numer BLIK ${blikNumber}`} style={{ display:'flex',alignItems:'center',gap:'8px',
            border:'1px solid var(--co-tint-line)',padding: '6px 12px',cursor:'pointer',
            transition:'color .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease',clipPath:CLIP.tag }}>
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
            <button type="button" onClick={onShowGuide}
              aria-label="Pomoc — jak to działa"
              className="header-action-btn"
              style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'color .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease',
              border:'1px solid var(--co-border)',color:'var(--co-dim)',background:'transparent',
              clipPath:CLIP.badge }}>
              <HelpCircle size={17} aria-hidden="true"/>
            </button>
            <button type="button" onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? 'Włącz dźwięki' : 'Wycisz dźwięki'} aria-pressed={isMuted}
              className="header-action-btn"
              style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'color .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease',
              border:isMuted?'1px solid var(--co-rose)':'1px solid var(--co-border)',
              color:isMuted?'var(--co-rose)':'var(--co-dim)',
              background:isMuted?'var(--co-tint-rose)':'transparent',
              clipPath:CLIP.badge }}>
              {isMuted ? <VolumeX size={17} aria-hidden="true"/> : <Volume2 size={17} aria-hidden="true"/>}
            </button>
            <button type="button" onClick={onToggleTheme}
              aria-label={theme === 'light' ? 'Włącz tryb ciemny' : 'Włącz tryb jasny'}
              className="header-action-btn"
              style={{ display:'flex',alignItems:'center',
              justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'color .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease',
              border:'1px solid var(--co-border)',color:'var(--co-dim)',background:'transparent',
              clipPath:CLIP.badge }}>
              {theme === 'light' ? <Moon size={17} aria-hidden="true"/> : <Sun size={17} aria-hidden="true"/>}
            </button>
          </div>
        </div>

        {/* Mobilny pasek BLIK: na telefonie nagłówek ma być kompaktowy, więc
            numer dostaje własny, pełnowymiarowy wiersz zamiast rozpychać górę. */}
        <button type="button" onClick={handleCopy} className="header-blik-mobile"
          aria-label={`Skopiuj numer BLIK ${blikNumber}`}>
          <Smartphone size={14} aria-hidden="true" style={{ color:'var(--co-dim)', flexShrink:0 }}/>
          <span className="header-blik-label">BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)',fontSize:TEXT.base,letterSpacing:TRACK.tight,color:'var(--co-text)',flex:1,textAlign:'left' }}>
            {blikNumber}
          </span>
          {copied ? <Check size={14} style={{ color:'var(--co-green)' }}/> : <CopyIcon/>}
        </button>

        <div className="header-hero" style={{ position:'relative',zIndex:10,padding: '16px 16px 20px',
          display:'flex',flexDirection:'column',alignItems:'center' }}>

          <div className="header-hero-eyebrow" style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px' }}>
            <div aria-hidden="true" style={{ height:1,width:36,background:'linear-gradient(to right,transparent,var(--co-tint-line))' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
              letterSpacing:TRACK.wide,color:'var(--co-dim)',textTransform:'uppercase' }}>
              CENTRUM DOWODZENIA
            </span>
            <div aria-hidden="true" style={{ height:1,width:36,background:'linear-gradient(to left,transparent,var(--co-tint-line))' }}/>
          </div>

          <div className="header-hero-arena" style={{ width:'100%',maxWidth:560,marginBottom:14,
            filter:chaosMode?'none':'var(--glow-drop-cyan)' }}>
            <ArenaCanvas chaosMode={chaosMode} lightMode={theme==='light'} onHit={handleHit}/>
          </div>


          <button className="header-hero-title" onClick={handleTitleClick} aria-label="CYBER-PONK — centrum dowodzenia"
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
          <div className="header-hero-meta" style={{ display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap',justifyContent:'center' }}>
            <span style={{
              display:'inline-flex',alignItems:'center',gap:5,
              fontFamily:'var(--font-display)',fontSize:TEXT.tiny,fontWeight:400,
              letterSpacing:TRACK.wide,textTransform:'uppercase',
              transition:'color .06s,text-shadow .06s',
              // Wygaszony stan był cyanem na 8% krycia, czyli praktycznie
              // niewidoczny w obu motywach.
              color: hitting ? 'var(--co-cyan)' : 'var(--co-dim)',
              textShadow: hitting ? 'var(--glow-cyan-md)' : 'none',
            }}><Zap size={11} aria-hidden="true" /> JACK IN <Zap size={11} aria-hidden="true" /></span>
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
            {/* W trybie demo dane nie pochodzą z bazy — bez tej plakietki łatwo
                pomylić podgląd projektu z prawdziwymi rozliczeniami grupy. */}
            {DEMO_MODE && (
              <span
                title="Dane demonstracyjne — nie pochodzą z bazy Firebase"
                style={{
                  fontFamily:'var(--font-mono)',fontSize:TEXT.tiny,color:'var(--co-amber)',
                  border:'1px solid var(--co-amber)',padding:'0 4px',letterSpacing:TRACK.tight,
                }}
              >DEMO</span>
            )}
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
          <button type="button" onClick={onShowGuide}
            aria-label="Pomoc — jak to działa"
            style={{ display:'flex',alignItems:'center',
            border:'1px solid var(--co-border)',color:'var(--co-dim)',
            background:'transparent',cursor:'pointer',
            justifyContent:'center',width:40,height:40,
            clipPath:CLIP.badge }}>
            <HelpCircle size={16} aria-hidden="true"/>
          </button>
          <button type="button" onClick={() => setIsMuted(!isMuted)}
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