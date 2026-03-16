import { Volume2, VolumeX, Smartphone, Copy, Check } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   3D Canvas Ping-Pong Arena
   Internal resolution: 1040 × 220 (2× retina), displays at 520 × 110.
   Perspective camera: slightly above and behind near side of table.
   Scene units: table is 7.6 wide × 2.4 deep × 3 tall (net height ≈ 0.6).
═══════════════════════════════════════════════════════════════ */

const CW = 1040, CH = 220;      // canvas internal size
const TL = 3.8;                  // table half-length (x)
const TW = 1.2;                  // table half-depth (z)
const NET_H = 0.60;              // net height in scene units
const ARC_H = 2.1;               // ball arc peak height
const DUR = 1800;                // animation cycle ms

// ── Perspective projection ────────────────────────────────────
// Maps 3D (x, y, z) to canvas 2D using bilinear table-corner interpolation.
// x ∈ [-TL, TL], y ∈ [0, ∞] (0=table surface), z ∈ [-TW, TW] (-=far, +=near)
function proj(x3, y3, z3) {
  const nx = x3 / TL;
  const t  = (z3 / TW + 1) * 0.5; // 0=far, 1=near

  // Screen position of table corners (tuned for good 3D look)
  const farX  = CW * 0.5 + nx * CW * 0.27;
  const farY  = CH * 0.26;
  const nearX = CW * 0.5 + nx * CW * 0.45;
  const nearY = CH * 0.86;

  const bx    = farX  + (nearX  - farX)  * t;
  const by    = farY  + (nearY  - farY)  * t;
  const scale = 0.65 + t * 0.70;           // objects larger when near

  return { x: bx, y: by - y3 * CH * 0.54 * scale, scale };
}

// ── Table ─────────────────────────────────────────────────────
function drawTable(ctx) {
  const c = [
    proj(-TL, 0, -TW), proj(TL, 0, -TW),
    proj( TL, 0,  TW), proj(-TL, 0,  TW),
  ];

  // Fill — dark indigo blue
  const grad = ctx.createLinearGradient(0, c[0].y, 0, c[3].y);
  grad.addColorStop(0,   'rgba(12, 16, 62, 0.95)');
  grad.addColorStop(0.5, 'rgba(16, 22, 75, 0.97)');
  grad.addColorStop(1,   'rgba(20, 28, 85, 0.98)');
  ctx.beginPath();
  ctx.moveTo(c[0].x, c[0].y);
  c.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Far edge (dim)
  ctx.beginPath();
  ctx.moveTo(c[0].x, c[0].y); ctx.lineTo(c[1].x, c[1].y);
  ctx.strokeStyle = 'rgba(129,140,248,0.30)'; ctx.lineWidth = 2; ctx.stroke();

  // Near edge (bright, glow)
  ctx.beginPath();
  ctx.moveTo(c[3].x, c[3].y); ctx.lineTo(c[2].x, c[2].y);
  ctx.strokeStyle = 'rgba(165,180,252,0.85)';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(129,140,248,0.6)'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;

  // Side edges
  [[c[0],c[3]], [c[1],c[2]]].forEach(([a,b]) => {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(129,140,248,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  // Centre line (dashed)
  const cf = proj(0, 0, -TW), cn = proj(0, 0, TW);
  ctx.beginPath(); ctx.moveTo(cf.x, cf.y); ctx.lineTo(cn.x, cn.y);
  ctx.setLineDash([8,10]); ctx.strokeStyle = 'rgba(165,180,252,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.setLineDash([]);

  // Front face (3D depth strip below near edge)
  ctx.beginPath();
  ctx.moveTo(c[3].x, c[3].y);
  ctx.lineTo(c[2].x, c[2].y);
  ctx.lineTo(c[2].x + 4, c[2].y + 16);
  ctx.lineTo(c[3].x - 4, c[3].y + 16);
  ctx.closePath();
  const faceGrad = ctx.createLinearGradient(0, c[3].y, 0, c[3].y + 16);
  faceGrad.addColorStop(0, 'rgba(129,140,248,0.22)');
  faceGrad.addColorStop(1, 'rgba(129,140,248,0.03)');
  ctx.fillStyle = faceGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(129,140,248,0.15)'; ctx.lineWidth = 1; ctx.stroke();
}

// ── Net ───────────────────────────────────────────────────────
function drawNet(ctx) {
  const steps = 7; // vertical mesh lines

  // Net shadow on table
  const sl = proj(-0.3, 0.01, -TW * 0.6), sr = proj(0.3, 0.01, TW * 0.6);
  const gsh = ctx.createLinearGradient(sl.x, sl.y, sr.x, sr.y);
  gsh.addColorStop(0, 'rgba(0,0,0,0)');
  gsh.addColorStop(0.5, 'rgba(0,0,0,0.25)');
  gsh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gsh;
  ctx.beginPath();
  ctx.ellipse((sl.x+sr.x)/2, (sl.y+sr.y)/2 + 4, (sr.x-sl.x)/2, 6, 0, 0, Math.PI*2);
  ctx.fill();

  // Draw horizontal mesh lines
  const ROWS = 6;
  for (let r = 0; r <= ROWS; r++) {
    const y3 = (r / ROWS) * NET_H;
    const l = proj(0, y3, -TW), ri = proj(0, y3, TW);
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(ri.x, ri.y);
    const alpha = 0.12 + (r / ROWS) * 0.12;
    ctx.strokeStyle = `rgba(165,180,252,${alpha})`; ctx.lineWidth = 1; ctx.stroke();
  }

  // Draw vertical mesh lines (perspective-correct)
  for (let s = 0; s <= steps; s++) {
    const z3 = -TW + (s / steps) * TW * 2;
    const bot = proj(0, 0, z3), top = proj(0, NET_H, z3);
    ctx.beginPath(); ctx.moveTo(bot.x, bot.y); ctx.lineTo(top.x, top.y);
    ctx.strokeStyle = 'rgba(165,180,252,0.09)'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  // Side posts
  [[-TW], [TW]].forEach(([z]) => {
    const bot = proj(0, 0, z), top = proj(0, NET_H, z);
    const pg = ctx.createLinearGradient(0, top.y, 0, bot.y);
    pg.addColorStop(0, 'rgba(210,220,255,0.9)');
    pg.addColorStop(1, 'rgba(165,180,252,0.4)');
    ctx.beginPath(); ctx.moveTo(bot.x, bot.y); ctx.lineTo(top.x, top.y);
    ctx.strokeStyle = pg; ctx.lineWidth = 3 * ((z > 0 ? 1.3 : 0.9)); ctx.stroke();
  });

  // Top bar (brightest element)
  const tl = proj(0, NET_H, -TW), tr = proj(0, NET_H, TW);
  ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.strokeStyle = 'rgba(215,225,255,0.92)'; ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(165,180,252,0.7)'; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
}

// ── Ball ──────────────────────────────────────────────────────
function drawBall(ctx, t) {
  const fwd = t < 0.5;
  const p   = fwd ? t * 2 : (t - 0.5) * 2;
  const x3  = fwd ? -TL + p * TL * 2 : TL - p * TL * 2;
  const y3  = Math.sin(p * Math.PI) * ARC_H;
  const z3  = 0; // travels along centre line

  // Shadow on table
  const sh = proj(x3, 0.02, z3);
  const shadowAlpha = 0.45 * Math.max(0, 1 - y3 / (ARC_H * 1.2));
  ctx.save();
  ctx.globalAlpha = shadowAlpha;
  ctx.beginPath();
  ctx.ellipse(sh.x, sh.y, 14 * sh.scale, 5 * sh.scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,30,0.85)'; ctx.fill();
  ctx.restore();

  // Ball sphere
  const bp = proj(x3, y3, z3);
  const r  = 9 * bp.scale;
  const g  = ctx.createRadialGradient(
    bp.x - r * 0.32, bp.y - r * 0.35, r * 0.04,
    bp.x, bp.y, r
  );
  g.addColorStop(0,    '#ffffff');
  g.addColorStop(0.35, '#edf0ff');
  g.addColorStop(0.75, '#bcc8f0');
  g.addColorStop(1,    '#8898d8');

  ctx.save();
  ctx.shadowColor = 'rgba(200,210,255,0.95)'; ctx.shadowBlur = 12 * bp.scale;
  ctx.beginPath(); ctx.arc(bp.x, bp.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

// ── Paddle ────────────────────────────────────────────────────
function drawPaddle(ctx, side, t) {
  const hitL = t < 0.06 || t > 0.94;
  const hitR = t > 0.47 && t < 0.57;
  const hit  = side < 0 ? hitL : hitR;

  const x3  = side * (TL + 0.55);
  const bp  = proj(x3, 0.18, 0);
  const r   = 22 * bp.scale * (hit ? 1.12 : 1.0);
  const rx  = r;
  const ry  = r * 0.88; // slight ellipse = 3D tilt

  // Outer glow
  ctx.save();
  ctx.shadowColor = hit ? 'rgba(165,180,252,0.9)' : 'rgba(129,140,248,0.45)';
  ctx.shadowBlur  = hit ? 28 : 16;

  // Paddle body gradient (dark indigo with edge highlight)
  const g = ctx.createRadialGradient(
    bp.x - rx * 0.28, bp.y - ry * 0.3, rx * 0.05,
    bp.x, bp.y, rx
  );
  g.addColorStop(0,    'rgba(160,175,255,0.92)');
  g.addColorStop(0.45, 'rgba(90,110,220,0.88)');
  g.addColorStop(0.80, 'rgba(45,60,180,0.85)');
  g.addColorStop(1,    'rgba(25,38,150,0.70)');

  ctx.beginPath(); ctx.ellipse(bp.x, bp.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();

  // Rim highlight
  ctx.beginPath(); ctx.ellipse(bp.x, bp.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = hit ? 'rgba(200,215,255,0.95)' : 'rgba(165,180,252,0.70)';
  ctx.lineWidth = hit ? 3 : 2; ctx.stroke();

  // Inner rubber face
  ctx.beginPath(); ctx.ellipse(bp.x, bp.y, rx * 0.52, ry * 0.52, 0, 0, Math.PI * 2);
  ctx.fillStyle = hit ? 'rgba(190,205,255,0.88)' : 'rgba(165,185,255,0.72)';
  ctx.fill();

  // Specular highlight (top-left arc)
  const hl = ctx.createRadialGradient(
    bp.x - rx * 0.35, bp.y - ry * 0.38, 0,
    bp.x - rx * 0.35, bp.y - ry * 0.38, rx * 0.55
  );
  hl.addColorStop(0,   'rgba(255,255,255,0.35)');
  hl.addColorStop(0.6, 'rgba(255,255,255,0.06)');
  hl.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.ellipse(bp.x, bp.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = hl; ctx.fill();
  ctx.restore();

  // Handle — projected in 3D downward
  const hp = proj(x3, -0.25, side * 0.1);
  ctx.save();
  ctx.strokeStyle = 'rgba(100,118,210,0.75)';
  ctx.lineWidth = 7 * bp.scale; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(80,100,200,0.4)'; ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(bp.x + side * rx * 0.18, bp.y + ry * 0.72);
  ctx.lineTo(hp.x + side * 4,          hp.y + 12 * bp.scale);
  ctx.stroke();
  ctx.restore();
}

// ── Canvas component ──────────────────────────────────────────
function PingPongArena({ chaosMode }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);
  const prevTsRef = useRef(null);
  const chaosRef  = useRef(chaosMode);
  useEffect(() => { chaosRef.current = chaosMode; }, [chaosMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');

    function render(ts) {
      if (prevTsRef.current === null) prevTsRef.current = ts;
      const dt = Math.min(ts - prevTsRef.current, 50); // cap at 50ms
      prevTsRef.current = ts;
      tRef.current = (tRef.current + dt / DUR) % 1;

      ctx.clearRect(0, 0, CW, CH);

      if (!chaosRef.current) {
        drawTable(ctx);
        drawNet(ctx);
        drawBall(ctx, tRef.current);
      }
      drawPaddle(ctx, -1, tRef.current);
      drawPaddle(ctx, +1, tRef.current);

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', maxWidth: 520, height: 110, display: 'block' }}
    />
  );
}

// ── Header ────────────────────────────────────────────────────
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
      id: i, emoji: pool[i % pool.length],
      x: Math.random() * 100, delay: Math.random() * 1.2,
      dur: 1.8 + Math.random() * 1.5, size: 18 + Math.random() * 24,
      rotate: Math.random() * 360, drift: (Math.random() - 0.5) * 120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  return (
    <>
      {/* Chaos */}
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
          background: 'radial-gradient(ellipse at 50% 30%, rgba(129,140,248,0.12) 0%, transparent 70%)' }} />
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
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cyber-text-dim)' }}><rect width="7" height="14" x="3" y="5" rx="1"/><path d="M7 5V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M11 5v14"/><path d="M21 15V9a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1Z"/></svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', color: '#818cf8', padding: '2px 6px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)' }}>BLIK</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.06em', color: '#e0e0e0' }}>{blikNumber}</span>
            <div style={{ width: 1, height: 14, background: '#252535', margin: '0 2px' }} />
            {copied ? <Check size={13} style={{ color: 'var(--cyber-green)' }} /> : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cyber-text-dim)' }}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
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
        <div style={{ position: 'relative', zIndex: 10, padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ height: 1, width: 36, background: 'linear-gradient(to right, transparent, rgba(129,140,248,0.5))' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.28em', color: 'rgba(129,140,248,0.55)', textTransform: 'uppercase' }}>CENTRUM DOWODZENIA</span>
            <div style={{ height: 1, width: 36, background: 'linear-gradient(to left, transparent, rgba(129,140,248,0.5))' }} />
          </div>

          {/* 3D Canvas Arena */}
          <PingPongArena chaosMode={chaosMode} />

          {/* Title */}
          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x"
            style={{ background: 'transparent', border: 'none', padding: '8px 0 0', cursor: 'pointer' }}>
            <span style={{
              display: 'block', fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 'clamp(2rem, 8vw, 4rem)', letterSpacing: '0.06em', lineHeight: 1, textAlign: 'center',
              color: '#c7d2fe',
              textShadow: chaosMode
                ? '0 0 30px rgba(129,140,248,0.9), 2px 2px 0 rgba(0,0,0,0.9)'
                : '0 0 30px rgba(129,140,248,0.18), 2px 2px 0 rgba(0,0,0,0.95)',
              animation: chaosMode ? 'headerBounce 0.4s ease-in-out 3' : 'none',
            }}>PING-PONG</span>
          </button>

          {/* Status */}
          <div style={{ width: '100%', maxWidth: '22rem', height: 1, margin: '12px 0 10px', background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.3) 50%, transparent)' }} />
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
          <span>🏓</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', color: '#818cf8', padding: '2px 5px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)' }}>BLIK</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#e0e0e0', fontSize: '0.85rem', letterSpacing: '0.06em' }}>{blikNumber}</span>
          {copied ? <Check size={12} style={{ color: 'var(--cyber-green)' }} /> : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cyber-text-dim)' }}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
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
