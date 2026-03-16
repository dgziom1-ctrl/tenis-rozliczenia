import { Volume2, VolumeX, Smartphone, Check } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════
   CYBER STYLES — Obszerna konfiguracja animacji i efektów CRT
═══════════════════════════════════════════════════ */
const CSS = `
@keyframes confettiBurst {
  0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) translateX(var(--drift)) rotate(720deg); opacity: 0; }
}
@keyframes chaosFlash {
  0% { opacity: 1; filter: hue-rotate(0deg) brightness(2.4); }
  50% { opacity: 0.5; filter: hue-rotate(180deg) brightness(1.8); }
  100% { opacity: 0; filter: hue-rotate(360deg) brightness(1); }
}
@keyframes headerBounce {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.08) translateY(-5px); filter: drop-shadow(0 0 25px rgba(129,140,248,0.8)); }
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.cyber-panel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #060609 0%, #0a0a0f 100%);
}
.cyber-panel::after {
  content: "";
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), 
              linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05));
  background-size: 100% 4px, 3px 100%;
  pointer-events: none;
  z-index: 5;
}
.scanline-bar {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 3px;
  background: rgba(129, 140, 248, 0.15);
  animation: scanline 8s linear infinite;
  z-index: 6;
}
`;

/* ═══════════════════════════════════════════════════
   3D ARENA — Pełny silnik renderujący (Nogi, Siatka, Detale)
═══════════════════════════════════════════════════ */
function Arena({ chaosMode, onHit }) {
  const ref = useRef(null);
  const raf = useRef(null);
  const t0  = useRef(null);

  useEffect(() => {
    if (chaosMode) { cancelAnimationFrame(raf.current); return; }
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    const W = 560, H = 155, CX = 265, CY = 78;

    // Kamera: 27° tilt + 20° yaw
    const RX = 0.471, RY = 0.349; 
    const cX = Math.cos(RX), sX = Math.sin(RX);
    const cY = Math.cos(RY), sY = Math.sin(RY);
    const FOV = 370, DIST = 290;

    const TX = 106, TZ = 36, NH = 19, TH = 5;
    const PR = 16, PX = 122, PY = -21, CYCLE = 2400;

    const proj = (x, y, z) => {
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
      const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const s = FOV / (z2 + DIST);
      return [CX + x1 * s, CY + y2 * s, s];
    };

    const ballAt = (t) => {
      const KF = [[-PX, PY, 0], [-42, 0, 0.22], [PX, PY, 0.5], [42, 0, 0.72], [-PX, PY, 1]]; //
      const CP = [[-74, -21], [0, -65], [74, -21], [0, -65]]; //
      let i = 3;
      for (let j = 0; j < 4; j++) if (t >= KF[j][2] && t <= KF[j+1][2]) { i = j; break; }
      const tl = (t - KF[i][2]) / (KF[i+1][2] - KF[i][2]), mt = 1 - tl;
      return [
        KF[i][0] * mt * mt + CP[i][0] * 2 * mt * tl + KF[i+1][0] * tl * tl,
        KF[i][1] * mt * mt + CP[i][1] * 2 * mt * tl + KF[i+1][1] * tl * tl,
      ];
    };

    const quad = (pts, fill) => {
      g.beginPath(); pts.forEach(([sx, sy], i) => i ? g.lineTo(sx, sy) : g.moveTo(sx, sy));
      g.closePath(); g.fillStyle = fill; g.fill();
    };

    const seg = (p1, p2, col, w) => {
      g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]);
      g.strokeStyle = col; g.lineWidth = w; g.stroke();
    };

    const ellipse = (cx, cy, rx, ry, rot) => {
      g.save(); g.translate(cx, cy); g.rotate(rot || 0);
      g.scale(1, ry / Math.max(rx, 0.1));
      g.beginPath(); g.arc(0, 0, Math.max(rx, 0.1), 0, Math.PI * 2);
      g.restore();
    };

    const draw = (progress) => {
      g.clearRect(0, 0, W, H);

      // 1. Nogi stołu — dla dodatkowej głębi 3D
      [[-TX, TZ], [TX, TZ], [-TX, -TZ], [TX, -TZ]].forEach(([lx, lz]) => {
        const p1 = proj(lx, 0, lz), p2 = proj(lx, 30, lz);
        seg(p1, p2, 'rgba(30, 40, 90, 0.45)', 2.5);
      });

      // 2. Powierzchnia stołu
      const FL = proj(-TX, 0, -TZ), FR = proj(TX, 0, -TZ);
      const BR = proj(TX, 0, TZ), BL = proj(-TX, 0, TZ);
      const tg = g.createLinearGradient(BL[0], BL[1], FL[0], FL[1]);
      tg.addColorStop(0, '#06091d'); tg.addColorStop(1, '#0f1a50');
      quad([FL, FR, BR, BL], tg);

      // 3. Siatka pomocnicza (Grid)
      for (let i = 1; i < 4; i++) {
        const wz = -TZ + (i / 4) * TZ * 2;
        seg(proj(-TX, 0, wz), proj(TX, 0, wz), `rgba(80, 110, 230, ${0.04 + i * 0.013})`, 0.8);
      }
      for (let i = 1; i < 6; i++) {
        const wx = -TX + (i / 6) * TX * 2;
        seg(proj(wx, 0, -TZ), proj(wx, 0, TZ), 'rgba(70, 100, 215, 0.06)', 0.75);
      }

      // 4. Krawędzie stołu i front face
      seg(BL, FL, 'rgba(88, 122, 242, 0.6)', 1.5);
      seg(BR, FR, 'rgba(88, 122, 242, 0.6)', 1.5);
      const FL2 = proj(-TX, TH, -TZ), FR2 = proj(TX, TH, -TZ);
      const fg = g.createLinearGradient(0, FL[1], 0, FL2[1]);
      fg.addColorStop(0, 'rgba(62, 98, 218, 0.5)'); fg.addColorStop(1, 'rgba(25, 48, 145, 0.06)');
      quad([FL, FR, FR2, FL2], fg);
      seg(FL, FR, 'rgba(138, 172, 255, 0.85)', 2);

      // 5. Siatka środkowa (Net)
      const nBN = proj(0, 0, -TZ), nBF = proj(0, 0, TZ);
      const nTN = proj(0, -NH, -TZ), nTF = proj(0, -NH, TZ);
      const ng = g.createLinearGradient(nTN[0], nTN[1], nBN[0], nBN[1]);
      ng.addColorStop(0, 'rgba(145, 165, 255, 0.22)'); ng.addColorStop(1, 'rgba(52, 82, 192, 0.04)');
      quad([nBN, nBF, nTF, nTN], ng);
      seg(nTN, nTF, 'rgba(236, 246, 255, 0.95)', 2.5); // Top bar

      // 6. Piłka i cień
      const bv = ballAt(progress), bq = proj(bv[0], bv[1], 0), bR = 6.4 * bq[2];
      const bs = proj(bv[0], 0, 0), sa = Math.max(0, 0.22 * (1 - Math.abs(bv[1]) / 68));
      g.save(); g.translate(bs[0], bs[1]); g.scale(1, 0.35);
      g.beginPath(); g.arc(0, 0, bR * 1.6, 0, Math.PI * 2);
      g.fillStyle = `rgba(36, 62, 188, ${sa})`; g.fill(); g.restore();

      const bg = g.createRadialGradient(bq[0] - bR * .3, bq[1] - bR * .3, 0, bq[0], bq[1], bR);
      bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#9aa0dc');
      g.save(); g.shadowBlur = 13 * bq[2]; g.shadowColor = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.arc(bq[0], bq[1], bR, 0, Math.PI * 2);
      g.fillStyle = bg; g.fill(); g.restore();

      // 7. Rakietki
      const leftHit  = drawPaddle(-PX, progress, true, g, proj, ellipse, seg);
      const rightHit = drawPaddle(PX, progress, false, g, proj, ellipse, seg);
      if (onHit) onHit(leftHit || rightHit);
    };

    const drawPaddle = (px, progress, isLeft) => {
      const hitT = isLeft ? Math.min(progress, 1 - progress) * 2 : Math.abs(progress - 0.5) * 2;
      const hitting = hitT < 0.10;
      const bump = hitting ? 1 + (1 - hitT / 0.1) * 0.15 : 1;
      const R = PR * bump, pc = proj(px, PY, 0);
      const pr = proj(px + R, PY, 0), pl = proj(px - R, PY, 0);
      const pt = proj(px, PY - R, 0), pb = proj(px, PY + R, 0);
      const cx = (pr[0] + pl[0]) / 2, cy = (pt[1] + pb[1]) / 2;
      const rx = Math.hypot(pr[0] - pl[0], pr[1] - pl[1]) / 2;
      const ry = Math.hypot(pt[0] - pb[0], pt[1] - pb[1]) / 2;
      const ang = Math.atan2(pt[1] - pb[1], pt[0] - pb[0]) + Math.PI / 2;

      // Warstwy rakietki: Glow, Body, Rubber, Handle
      g.save(); g.shadowBlur = hitting ? 22 : 8; g.shadowColor = hitting ? '#818cf8' : 'rgba(125,145,250,0.4)';
      g.strokeStyle = hitting ? '#c7d2fe' : 'rgba(129, 140, 248, 0.4)';
      g.lineWidth = 3.8; ellipse(cx, cy, rx, ry, ang); g.stroke(); g.restore();

      const bdg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      bdg.addColorStop(0, '#1e1b4b'); bdg.addColorStop(1, '#020617');
      ellipse(cx, cy, rx * 0.98, ry * 0.98, ang); g.fillStyle = bdg; g.fill();

      const rfg = g.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.55);
      rfg.addColorStop(0, hitting ? '#e0e7ff' : '#818cf8'); rfg.addColorStop(1, 'rgba(49, 46, 129, 0.7)');
      ellipse(cx, cy, rx * 0.55, ry * 0.55, ang); g.fillStyle = rfg; g.fill();

      const hs = proj(px, PY + R / pc[2] + 2, 0), he = proj(px, PY + R / pc[2] + 16, 0);
      seg(hs, he, '#1e1b4b', 5 * pc[2]); seg(hs, he, '#312e81', 2 * pc[2]);

      return hitting;
    };

    const loop = (ts) => {
      if (!t0.current) t0.current = ts;
      draw(((ts - t0.current) % CYCLE) / CYCLE);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [chaosMode, onHit]);

  return <canvas ref={ref} width={560} height={155} style={{ display: 'block', width: '100%', maxWidth: 560 }} />;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT — UI i Zarządzanie Stanem
═══════════════════════════════════════════════════ */
export default function Header({ isMuted, setIsMuted, isConnected, scrolled }) {
  const [copied, setCopied] = useState(false);
  const [chaosMode, setChaosMode] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [isHitting, setIsHitting] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || "500 600 700"; //

  const handleHit = useCallback((hit) => { setIsHitting(hit); }, []); //

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true); setTimeout(() => setCopied(false), 2000); //
  };

  const activateChaos = () => {
    setChaosMode(true);
    const pool = ['🏓', '⚡', '💀', '🔥', '💥', '🎮', '🚀', '💎', '⚠️', '🌪️'];
    setConfetti(Array.from({ length: 50 }, (_, i) => ({
      id: i, emoji: pool[Math.floor(Math.random() * pool.length)],
      x: Math.random() * 100, delay: Math.random() * 1.5,
      dur: 2 + Math.random() * 2, drift: (Math.random() - 0.5) * 180,
      size: 18 + Math.random() * 24
    })));
    setTimeout(() => { setChaosMode(false); setConfetti([]); }, 5000);
  };

  const handleTitleClick = () => {
    clickCount.current++;
    clearTimeout(clickTimer.current);
    if (clickCount.current >= 5) { activateChaos(); clickCount.current = 0; }
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
  };

  const CopyIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* Warstwa Chaosu / Confetti */}
      {chaosMode && confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-[100]" style={{
          left: `${c.x}%`, top: '-50px', fontSize: `${c.size}px`,
          animation: `confettiBurst ${c.dur}s ${c.delay}s forwards`, '--drift': `${c.drift}px`
        }}>{c.emoji}</div>
      ))}

      <header className="cyber-panel" style={{ borderBottom: '1px solid #1a1a2e' }}>
        <div className="scanline-bar" />
        
        {/* Dekoracyjne narożniki neonowe */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 85, height: 2, background: '#818cf8', boxShadow: '0 0 15px #818cf8', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 85, height: 2, background: '#818cf8', boxShadow: '0 0 15px #818cf8', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 2, height: 55, background: 'linear-gradient(to bottom, #818cf8, transparent)', zIndex: 10 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 2, height: 55, background: 'linear-gradient(to bottom, #818cf8, transparent)', zIndex: 10 }} />

        {/* Top Navigation Bar */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #12121e' }}>
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: 10, background: '#08080d', border: '1px solid #252535',
            padding: '8px 15px', cursor: 'pointer', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)'
          }}>
            <Smartphone size={14} color="#818cf8" />
            <span style={{ fontFamily: 'var(--font-display)', color: '#818cf8', fontSize: '0.65rem', fontWeight: 800 }}>BLIK</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#e0e0e0', fontSize: '0.9rem' }}>{blikNumber}</span>
            {copied ? <Check size={14} color="#10b981" /> : <CopyIcon />}
          </button>

          <button onClick={() => setIsMuted(!isMuted)} style={{
            background: isMuted ? 'rgba(239, 68, 68, 0.1)' : 'transparent', border: '1px solid #252535', 
            padding: 9, cursor: 'pointer', color: isMuted ? '#ef4444' : '#818cf8', 
            clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'
          }}>
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Central Arena i Tytuł */}
        <div style={{ position: 'relative', zIndex: 10, padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
             <div style={{ height: 1, width: 45, background: 'linear-gradient(to right, transparent, #818cf8)' }} />
             <span style={{ opacity: 0.6, fontSize: '0.62rem', letterSpacing: '0.4em', color: '#818cf8', fontWeight: 800 }}>NEURAL INTERFACE v2.0.77</span>
             <div style={{ height: 1, width: 45, background: 'linear-gradient(to left, transparent, #818cf8)' }} />
          </div>

          <div style={{ width: '100%', maxWidth: 560, marginBottom: 20 }}>
            <Arena chaosMode={chaosMode} onHit={handleHit} />
          </div>

          <button onClick={handleTitleClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <h1 style={{
              margin: 0, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 4.2rem)',
              color: chaosMode ? '#a5b4fc' : '#f8fafc', letterSpacing: '0.08em',
              textShadow: chaosMode ? '0 0 30px #818cf8' : '2px 2px 0px #1e293b',
              animation: chaosMode ? 'headerBounce 0.4s infinite' : 'none'
            }}>CYBER PONK</h1>
          </button>

          <div style={{ width: 260, height: 1, background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.4), transparent)', margin: '20px 0' }} />

          {/* Status Bar */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.25em',
              transition: 'all 0.08s ease-out', color: isHitting ? '#ffffff' : 'rgba(129,140,248,0.2)',
              textShadow: isHitting ? '0 0 15px #818cf8, 0 0 30px #818cf8' : 'none',
              transform: isHitting ? 'scale(1.2)' : 'scale(1)'
            }}>⚡ JACK IN ⚡</span>
            
            <div style={{ width: 1, height: 12, background: '#1a1a2e' }} />

            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 700,
              color: isConnected ? '#10b981' : '#ef4444',
              textShadow: isConnected ? '0 0 10px #10b981' : '0 0 10px #ef4444'
            }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>

            <div style={{ width: 1, height: 12, background: '#1a1a2e' }} />

            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(129, 140, 248, 0.35)' }}>ZONE_01</span>
          </div>
        </div>
      </header>

      {/* Kompaktowy pasek przy scrollowaniu */}
      <div style={{
        position: 'fixed', top: scrolled ? 0 : -65, left: 0, right: 0, height: 55,
        background: 'rgba(6, 6, 9, 0.98)', borderBottom: '2px solid #818cf8',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 25px', zIndex: 1000, transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 950, color: '#f8fafc', fontSize: '1.4rem' }}>CP</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(129,140,248,0.12)', padding: '5px 12px', borderRadius: '4px', border: '1px solid rgba(129,140,248,0.2)' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#818cf8' }}>BLIK</span>
            <span style={{ fontSize: '0.9rem', color: '#e0e0e0', fontFamily: 'var(--font-mono)' }}>{blikNumber}</span>
          </div>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 12px #10b981' : '0 0 12px #ef4444' }} />
        </div>
      </div>
    </>
  );
}