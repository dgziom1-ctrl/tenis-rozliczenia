import { Volume2, VolumeX, Smartphone, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════
   3D PING-PONG ARENA — canvas-based, real perspective projection
   Camera: 28° tilt above horizontal, centered on table.
   Coordinate system:
     X = left / right (table length)
     Y = up / down    (negative = up)
     Z = depth        (table width, into screen)
═══════════════════════════════════════════════════════════ */

function Arena3D({ chaosMode }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const startRef  = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chaosMode) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;   // 520
    const H = canvas.height;  // 130

    // Camera / projection constants
    const CX      = W / 2;                    // 260  — horizontal centre
    const CY      = H * 0.60;                 // 78   — vertical centre (shifted down)
    const RX      = 28 * Math.PI / 180;       // tilt angle
    const cosRX   = Math.cos(RX);
    const sinRX   = Math.sin(RX);
    const FOV     = 420;                       // focal length
    const DIST    = 310;                       // viewer-to-scene depth

    // Scene dimensions
    const TX      = 148;   // table half-length (X)
    const TZ      = 34;    // table half-width  (Z, depth into screen)
    const NET_H   = 25;    // net height above table surface
    const PEAK    = 42;    // max ball height above table
    const THICK   = 5;     // table front-face thickness

    const CYCLE   = 2100;  // ms per full rally cycle

    // Project world-space (x, y, z) → canvas pixel (sx, sy) + scale factor
    function proj(x, y, z) {
      const y2  = y * cosRX - z * sinRX;
      const z2  = y * sinRX + z * cosRX;
      const s   = FOV / (z2 + DIST);
      return { sx: CX + x * s, sy: CY + y2 * s, s };
    }

    // ─── Draw helpers ────────────────────────────────────────
    function poly(pts, fill, stroke, lineW = 1.5) {
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
      ctx.closePath();
      if (fill)   { ctx.fillStyle = fill;   ctx.fill();   }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW; ctx.stroke(); }
    }

    function line(a, b, color, w, glow) {
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = color;
      ctx.lineWidth   = w;
      if (glow) { ctx.shadowBlur = glow.blur; ctx.shadowColor = glow.color; }
      ctx.stroke();
      if (glow) ctx.shadowBlur = 0;
    }

    // ─── Main draw ───────────────────────────────────────────
    function drawScene(progress) {
      ctx.clearRect(0, 0, W, H);

      /* ── TABLE ── */
      const tFL = proj(-TX, 0, -TZ);   // front-left
      const tFR = proj( TX, 0, -TZ);   // front-right
      const tBR = proj( TX, 0,  TZ);   // back-right
      const tBL = proj(-TX, 0,  TZ);   // back-left

      // Glow bloom beneath table
      const grd = ctx.createLinearGradient(tBL.sx, tBL.sy, tFL.sx, tFL.sy);
      grd.addColorStop(0, 'rgba(80,100,255,0.0)');
      grd.addColorStop(1, 'rgba(80,100,255,0.08)');

      // Table top face — gradient from far (dark) to near (lighter)
      const tGrad = ctx.createLinearGradient(tBL.sx, tBL.sy, tFL.sx, tFL.sy);
      tGrad.addColorStop(0, '#0a0d30');
      tGrad.addColorStop(1, '#16205e');
      poly([tFL, tFR, tBR, tBL], tGrad, 'rgba(100,130,255,0.5)', 1.5);

      // Centre line (along Z, at X=0)
      line(proj(0, 0, -TZ), proj(0, 0, TZ), 'rgba(180,200,255,0.18)', 1);

      // Sideline accents
      line(tBL, tFL, 'rgba(100,130,255,0.5)', 1.5);
      line(tBR, tFR, 'rgba(100,130,255,0.5)', 1.5);

      // Table front-face thickness strip
      const ttFR = proj( TX, THICK, -TZ);
      const ttFL = proj(-TX, THICK, -TZ);
      const thGrad = ctx.createLinearGradient(0, tFL.sy, 0, ttFL.sy);
      thGrad.addColorStop(0, 'rgba(70,100,220,0.45)');
      thGrad.addColorStop(1, 'rgba(40,60,160,0.15)');
      poly([tFL, tFR, ttFR, ttFL], thGrad, null);
      // bright front edge
      line(tFL, tFR, 'rgba(140,170,255,0.75)', 1.5);

      /* ── NET ── */
      const nBotNear = proj(0, 0,      -TZ);   // bottom, front post
      const nBotFar  = proj(0, 0,       TZ);   // bottom, back  post
      const nTopFar  = proj(0, -NET_H,  TZ);   // top, back
      const nTopNear = proj(0, -NET_H, -TZ);   // top, front

      // Net mesh panel
      const nGrad = ctx.createLinearGradient(nTopNear.sx, nTopNear.sy, nBotNear.sx, nBotNear.sy);
      nGrad.addColorStop(0, 'rgba(180,200,255,0.38)');
      nGrad.addColorStop(1, 'rgba(80,110,200,0.08)');
      poly([nBotNear, nBotFar, nTopFar, nTopNear], nGrad, 'rgba(140,170,255,0.3)', 1);

      // Net posts
      line(nBotNear, nTopNear, 'rgba(200,220,255,0.75)', 2);
      line(nBotFar,  nTopFar,  'rgba(200,220,255,0.55)', 1.5);

      // Net top bar — brightest element
      ctx.save();
      ctx.shadowBlur  = 8;
      ctx.shadowColor = 'rgba(180,210,255,0.9)';
      line(nTopNear, nTopFar, 'rgba(230,240,255,0.95)', 2.5);
      ctx.restore();

      /* ── BALL trajectory ──
         Forward  0→0.5 : X goes -TX → +TX
         Return   0.5→1 : X goes +TX → -TX
         Height = |sin(progress × 2π)| × PEAK (two arcs per loop)
      ── */
      const half = 0.5;
      const bX   = progress < half
        ? -TX + (progress / half) * TX * 2
        :  TX - ((progress - half) / half) * TX * 2;
      const bY   = -Math.abs(Math.sin(progress * Math.PI * 2)) * PEAK;

      const bPos = proj(bX, bY, 0);
      const bR   = 7.5 * bPos.s;

      // Shadow blob on table surface
      const bShadow = proj(bX, 0, 0);
      const sAlpha  = 0.28 * (1 - Math.abs(bY) / PEAK * 0.85);
      ctx.beginPath();
      ctx.ellipse(bShadow.sx, bShadow.sy, bR * 1.5, bR * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60,90,210,${sAlpha})`;
      ctx.fill();

      // Ghost trail (slight delay)
      const tProg  = (progress - 0.028 + 1) % 1;
      const tBX    = tProg < half ? -TX + (tProg/half)*TX*2 : TX - ((tProg-half)/half)*TX*2;
      const tBY    = -Math.abs(Math.sin(tProg * Math.PI * 2)) * PEAK;
      const tPos   = proj(tBX, tBY, 0);
      ctx.beginPath();
      ctx.arc(tPos.sx, tPos.sy, 5 * tPos.s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,200,255,0.10)';
      ctx.fill();

      // Main ball with glow
      ctx.save();
      ctx.shadowBlur  = 16 * bPos.s;
      ctx.shadowColor = 'rgba(255,255,255,0.85)';
      const ballGrad = ctx.createRadialGradient(
        bPos.sx - bR * 0.3, bPos.sy - bR * 0.3, 0,
        bPos.sx, bPos.sy, bR
      );
      ballGrad.addColorStop(0,   '#ffffff');
      ballGrad.addColorStop(0.5, '#d4d8f8');
      ballGrad.addColorStop(1,   '#9aa0dc');
      ctx.beginPath();
      ctx.arc(bPos.sx, bPos.sy, bR, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.restore();

      /* ── PADDLES ── */
      const drawPaddle = (px, isLeft) => {
        // Hit timing: left hits at progress≈0/1, right at progress≈0.5
        const hitT = isLeft ? Math.min(progress, 1 - progress) * 2 : Math.abs(progress - 0.5) * 2;
        const hitting = hitT < 0.12;
        const hitBump = hitting ? 1 + (1 - hitT / 0.12) * 0.14 : 1;

        const pPos = proj(px, -22, 0);
        const r    = 22 * pPos.s * hitBump;

        ctx.save();
        ctx.translate(pPos.sx, pPos.sy);

        // Glow ring on hit
        if (hitting) {
          ctx.shadowBlur  = 22;
          ctx.shadowColor = 'rgba(165,180,252,0.8)';
        } else {
          ctx.shadowBlur  = 10;
          ctx.shadowColor = 'rgba(129,140,248,0.45)';
        }

        // Paddle body
        const pgrd = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        pgrd.addColorStop(0, '#252548');
        pgrd.addColorStop(1, '#141430');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = pgrd;
        ctx.fill();

        const edgeAlpha = 0.45 + 0.45 * pPos.s + (hitting ? 0.25 : 0);
        ctx.strokeStyle = `rgba(129,140,248,${edgeAlpha})`;
        ctx.lineWidth   = 2 * pPos.s;
        ctx.stroke();
        ctx.shadowBlur  = 0;

        // Rubber face circle
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165,180,252,${0.75 + (hitting ? 0.2 : 0)})`;
        ctx.fill();

        // Grip lines on rubber face
        for (let li = -1; li <= 1; li++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.35, li * r * 0.14);
          ctx.lineTo( r * 0.35, li * r * 0.14);
          ctx.strokeStyle = 'rgba(100,120,210,0.4)';
          ctx.lineWidth   = 1;
          ctx.stroke();
        }

        ctx.restore();

        // Handle (below paddle)
        const handleBot = proj(px, -22 + (r / pPos.s) + 12, 0);
        ctx.beginPath();
        ctx.moveTo(pPos.sx, pPos.sy + r);
        ctx.lineTo(handleBot.sx, handleBot.sy);
        ctx.strokeStyle = 'rgba(80,90,130,0.65)';
        ctx.lineWidth   = 5 * pPos.s;
        ctx.lineCap     = 'round';
        ctx.stroke();
        ctx.lineCap     = 'butt';
      };

      drawPaddle(-TX - 24, true);   // left
      drawPaddle( TX + 24, false);  // right
    }

    function render(ts) {
      if (!startRef.current) startRef.current = ts;
      const progress = ((ts - startRef.current) % CYCLE) / CYCLE;
      drawScene(progress);
      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [chaosMode]);

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={130}
      style={{ display: 'block', width: '100%', maxWidth: 520, height: 'auto' }}
    />
  );
}


/* ═══════════════════════════════════════════════════════════
   CHAOS MODE KEYFRAMES (CSS-only, no canvas)
═══════════════════════════════════════════════════════════ */
const EXTRA_CSS = `
  @keyframes confettiBurst {
    0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) translateX(var(--drift)) rotate(720deg); opacity: 0; }
  }
  @keyframes chaosFlash {
    0%   { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes headerBounce {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.07); }
  }
`;


/* ═══════════════════════════════════════════════════════════
   MAIN HEADER COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Header({ isMuted, setIsMuted, isConnected, scrolled }) {
  const [copied,    setCopied]    = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti,  setConfetti]  = useState([]);
  const [tick,      setTick]      = useState(true);

  const chaosTimer  = useRef(null);
  const clickCount  = useRef(0);
  const clickTimer  = useRef(null);
  const tickTimer   = useRef(null);

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
      id: i,
      emoji: pool[Math.floor(Math.random() * pool.length)],
      x:      Math.random() * 100,
      delay:  Math.random() * 1.2,
      dur:    1.8 + Math.random() * 1.5,
      size:   18 + Math.random() * 24,
      rotate: Math.random() * 360,
      drift:  (Math.random() - 0.5) * 120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  return (
    <>
      <style>{EXTRA_CSS}</style>

      {/* Confetti in chaos mode */}
      {chaosMode && confetti.map(c => (
        <div key={c.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${c.x}%`, top: 0, fontSize: `${c.size}px`,
            animation: `confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift': `${c.drift}px`,
            transform: `rotate(${c.rotate}deg)`,
          }}
        >{c.emoji}</div>
      ))}
      {chaosMode && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 49,
            animation: 'chaosFlash 0.6s ease-out forwards',
            background: 'radial-gradient(ellipse at 50% 30%, rgba(129,140,248,0.1) 0%, transparent 70%)',
          }}
        />
      )}

      <header style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #060609 0%, #0a0a0f 100%)',
        borderBottom: '1px solid #1a1a2e',
      }}>
        {/* Corner accent lines */}
        {[
          { top:0, left:0,  width:70, height:2,  box:'0 0 10px rgba(129,140,248,0.7)' },
          { top:0, right:0, width:70, height:2,  box:'0 0 10px rgba(129,140,248,0.7)' },
        ].map((s, i) => (
          <div key={i} style={{ position:'absolute', zIndex:2, height:s.height, width:s.width,
            ...('left' in s ? {left:s.left} : {right:s.right}), top:s.top,
            background:'#818cf8', boxShadow:s.box }} />
        ))}
        <div style={{ position:'absolute', top:0, left:0,  width:2, height:44, zIndex:2, background:'linear-gradient(to bottom, #818cf8, transparent)' }} />
        <div style={{ position:'absolute', top:0, right:0, width:2, height:44, zIndex:2, background:'linear-gradient(to bottom, #818cf8, transparent)' }} />

        {/* ── TOP BAR ── */}
        <div style={{
          position:'relative', zIndex:10,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 16px', borderBottom:'1px solid #12121e',
        }}>
          {/* BLIK copy button */}
          <button onClick={handleCopy} style={{
            display:'flex', alignItems:'center', gap:'8px',
            background:'#08080d', border:'1px solid #252535',
            padding:'7px 12px', cursor:'pointer', transition:'all 0.18s',
            clipPath:'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            <Smartphone size={14} style={{ color:'var(--cyber-text-dim)' }} />
            <span style={{
              fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:700,
              letterSpacing:'0.18em', color:'#818cf8', padding:'2px 6px',
              background:'rgba(129,140,248,0.1)', border:'1px solid rgba(129,140,248,0.25)',
            }}>BLIK</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem', letterSpacing:'0.06em', color:'#e0e0e0' }}>
              {blikNumber}
            </span>
            <div style={{ width:1, height:14, background:'#252535', margin:'0 2px' }} />
            {copied
              ? <Check size={13} style={{ color:'var(--cyber-green)' }} />
              : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     style={{ color:'var(--cyber-text-dim)' }}>
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
            }
          </button>

          {/* Mute button */}
          <button onClick={() => setIsMuted(!isMuted)} style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:36, height:36,
            border:   isMuted ? '1px solid rgba(255,0,51,0.5)' : '1px solid #252535',
            color:    isMuted ? 'var(--cyber-red)'              : 'var(--cyber-text-dim)',
            background: isMuted ? 'rgba(255,0,51,0.08)'         : 'transparent',
            cursor:'pointer', transition:'all 0.18s',
            clipPath:'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          }}>
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>

        {/* ── HERO ── */}
        <div style={{
          position:'relative', zIndex:10,
          padding:'18px 16px 22px',
          display:'flex', flexDirection:'column', alignItems:'center',
        }}>

          {/* Eyebrow */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ height:1, width:36, background:'linear-gradient(to right, transparent, rgba(129,140,248,0.5))' }} />
            <span style={{
              fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:600,
              letterSpacing:'0.28em', color:'rgba(129,140,248,0.55)', textTransform:'uppercase',
            }}>CENTRUM DOWODZENIA</span>
            <div style={{ height:1, width:36, background:'linear-gradient(to left, transparent, rgba(129,140,248,0.5))' }} />
          </div>

          {/* ── 3D ARENA ── */}
          <div style={{
            width:'100%', maxWidth:520, marginBottom:14,
            position:'relative',
            // subtle ambient glow behind canvas
            filter: chaosMode ? 'none' : 'drop-shadow(0 0 18px rgba(80,100,255,0.18))',
          }}>
            <Arena3D chaosMode={chaosMode} />
          </div>

          {/* TITLE */}
          <button
            onClick={handleTitleClick}
            aria-label="Ping Pong — kliknij 5× dla niespodzianki"
            style={{ background:'transparent', border:'none', padding:0, cursor:'pointer' }}
          >
            <span style={{
              display:'block',
              fontFamily:'var(--font-display)', fontWeight:900,
              fontSize:'clamp(2rem, 8vw, 4rem)', letterSpacing:'0.06em',
              lineHeight:1, textAlign:'center',
              ...(chaosMode ? {
                color:'#a5b4fc',
                animation:'headerBounce 0.4s ease-in-out 3',
                textShadow:'0 0 30px rgba(129,140,248,0.8), 2px 2px 0 rgba(0,0,0,0.9)',
              } : {
                color:'#c7d2fe',
                textShadow:'0 0 30px rgba(129,140,248,0.2), 2px 2px 0 rgba(0,0,0,0.95)',
              }),
            }}>PING-PONG</span>
          </button>

          {/* Status bar */}
          <div style={{
            width:'100%', maxWidth:'22rem', height:1, margin:'14px 0 10px',
            background:'linear-gradient(90deg, transparent, rgba(129,140,248,0.3) 50%, transparent)',
          }} />
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <span style={{
              fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:600,
              letterSpacing:'0.2em', textTransform:'uppercase',
              color:       tick ? '#818cf8' : 'rgba(129,140,248,0.1)',
              textShadow:  tick ? '0 0 10px rgba(129,140,248,0.7)' : 'none',
              transition:  'color 0.15s, text-shadow 0.15s',
            }}>⚡ JACK IN ⚡</span>
            <span style={{ color:'#1a1a2e' }}>│</span>
            <span style={{
              fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:700,
              letterSpacing:'0.1em',
              color:      isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)',
              textShadow: isConnected ? '0 0 8px var(--cyber-green)' : '0 0 8px var(--cyber-red)',
            }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color:'#1a1a2e' }}>│</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'var(--cyber-text-dim)' }}>
              v2.0.77
            </span>
          </div>
        </div>
      </header>

      {/* Separator bar */}
      <div style={{
        height:2,
        background:'linear-gradient(90deg, transparent, #818cf8 30%, #818cf8 70%, transparent)',
        opacity:0.5,
      }} />

      {/* Compact sticky (mobile) */}
      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{
          background:'transparent', border:'none', padding:0, cursor:'pointer',
          display:'flex', alignItems:'center', gap:'6px',
        }}>
          <span style={{ fontSize:'0.9rem' }}>🏓</span>
          <span style={{
            fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:700,
            letterSpacing:'0.15em', color:'#818cf8', padding:'2px 5px',
            background:'rgba(129,140,248,0.1)', border:'1px solid rgba(129,140,248,0.2)',
          }}>BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)', color:'#e0e0e0', fontSize:'0.85rem', letterSpacing:'0.06em' }}>
            {blikNumber}
          </span>
          {copied
            ? <Check size={12} style={{ color:'var(--cyber-green)' }} />
            : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                   style={{ color:'var(--cyber-text-dim)' }}>
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
          }
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{
            fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.08em',
            color: isConnected ? 'var(--cyber-green)' : 'var(--cyber-red)',
          }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
          <button onClick={() => setIsMuted(!isMuted)} style={{
            border:     isMuted ? '1px solid rgba(255,0,51,0.4)' : '1px solid #252535',
            color:      isMuted ? 'var(--cyber-red)'              : 'var(--cyber-text-dim)',
            background: 'transparent', padding:'4px 6px', cursor:'pointer',
            display:'flex', alignItems:'center',
            clipPath:'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
          }}>
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </>
  );
}
