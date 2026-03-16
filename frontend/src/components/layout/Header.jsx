import { Volume2, VolumeX, Smartphone, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const CSS = `
@keyframes confettiBurst{0%{transform:translateY(0)translateX(0)rotate(0deg);opacity:1}100%{transform:translateY(110vh)translateX(var(--drift))rotate(720deg);opacity:0}}
@keyframes chaosFlash{0%{opacity:1}100%{opacity:0}}
@keyframes headerBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
`;

function Arena({ chaosMode }) {
  const ref = useRef(null);
  const raf = useRef(null);
  const t0  = useRef(null);

  useEffect(() => {
    if (chaosMode) { cancelAnimationFrame(raf.current); return; }
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = 560, H = 150, CX = W / 2, CY = 70;
    const FOV = 390, DIST = 290;

    // Camera: tilt down (RX) + slight yaw right (RY)
    // The yaw is critical — makes net posts offset on screen → real 3D look
    const RX = 32 * Math.PI / 180;
    const RY =  9 * Math.PI / 180;
    const cX = Math.cos(RX), sX = Math.sin(RX);
    const cY = Math.cos(RY), sY = Math.sin(RY);

    const TX = 112, TZ = 40;       // table half-extents
    const NH = 20, THICK = 5;      // net height, table front-face thickness
    const PR = 18, PX = 130;       // paddle radius, paddle X
    const PY = -20;                 // paddle height above table
    const CYCLE = 2400;

    // Projection with yaw + tilt
    const proj = (x, y, z) => {
      // Y-axis rotation (yaw)
      const x1 =  x * cY + z * sY;
      const z1 = -x * sY + z * cY;
      // X-axis rotation (tilt down)
      const y2 = y * cX - z1 * sX;
      const z2 = y * sX + z1 * cX;
      const s  = FOV / (z2 + DIST);
      return { sx: CX + x1 * s, sy: CY + y2 * s, s };
    };

    // Ball physics — CORRECT sequence:
    // left paddle → arc OVER net → bounce on RIGHT side → right paddle
    // right paddle → arc OVER net → bounce on LEFT side → left paddle
    const KF = [
      { t: 0.00, x: -PX, y: PY  },  // left paddle hit
      { t: 0.36, x:  52, y: 0   },  // bounce: RIGHT half of table
      { t: 0.50, x:  PX, y: PY  },  // right paddle hit
      { t: 0.86, x: -52, y: 0   },  // bounce: LEFT half of table
      { t: 1.00, x: -PX, y: PY  },  // back to left paddle
    ];
    // Bezier control points: arc must peak over the net (x≈0, high y)
    const CP = [
      { x:  8, y: -75 },   // left hit → right bounce: peak over net
      { x: 92, y: -26 },   // right bounce → right paddle: short rise
      { x: -8, y: -75 },   // right hit → left bounce: peak over net
      { x:-92, y: -26 },   // left bounce → left paddle: short rise
    ];

    const ballAt = (p) => {
      let i = KF.length - 2;
      for (let j = 0; j < KF.length - 1; j++) {
        if (p >= KF[j].t && p <= KF[j+1].t) { i = j; break; }
      }
      const tl = (p - KF[i].t) / (KF[i+1].t - KF[i].t);
      const mt = 1 - tl;
      return {
        x: KF[i].x*mt*mt + CP[i].x*2*mt*tl + KF[i+1].x*tl*tl,
        y: KF[i].y*mt*mt + CP[i].y*2*mt*tl + KF[i+1].y*tl*tl,
      };
    };

    const ln = (a, b, col, w) => {
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    };
    const poly = (pts, fill, stroke, sw) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      pts.slice(1).forEach(p => ctx.lineTo(p.sx, p.sy));
      ctx.closePath();
      if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
    };

    const draw = (progress) => {
      ctx.clearRect(0, 0, W, H);

      // ── TABLE ──
      const tFL = proj(-TX, 0, -TZ), tFR = proj( TX, 0, -TZ);
      const tBR = proj( TX, 0,  TZ), tBL = proj(-TX, 0,  TZ);

      const topG = ctx.createLinearGradient(tBL.sx, tBL.sy, tFL.sx, tFL.sy);
      topG.addColorStop(0, '#05081c'); topG.addColorStop(1, '#111c52');
      poly([tFL, tFR, tBR, tBL], topG);

      // Subtle depth grid on surface
      for (let i = 1; i <= 3; i++) {
        const wz = -TZ + (i / 4) * TZ * 2;
        ln(proj(-TX, 0, wz), proj(TX, 0, wz), `rgba(95,125,255,${0.055+i*0.008})`, 0.8);
      }
      // Centre line (length)
      ln(proj(0, 0, -TZ), proj(0, 0, TZ), 'rgba(165,195,255,0.12)', 1);
      // Side edges
      ctx.save(); ctx.shadowBlur = 0;
      ln(tBL, tFL, 'rgba(95,130,255,0.62)', 1.4);
      ln(tBR, tFR, 'rgba(95,130,255,0.62)', 1.4);
      ln(tBL, tBR, 'rgba(95,130,255,0.18)', 1);
      ctx.restore();

      // Front face
      const tFL2 = proj(-TX, THICK, -TZ), tFR2 = proj(TX, THICK, -TZ);
      const fG = ctx.createLinearGradient(0, tFL.sy, 0, tFL2.sy);
      fG.addColorStop(0, 'rgba(70,105,225,0.52)'); fG.addColorStop(1, 'rgba(28,52,155,0.07)');
      poly([tFL, tFR, tFR2, tFL2], fG);
      ctx.save(); ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(105,145,255,0.55)';
      ln(tFL, tFR, 'rgba(145,180,255,0.88)', 1.7);
      ctx.restore();

      // ── NET ──
      // Posts: near (z=-TZ) and far (z=+TZ)
      // With yaw, near post is offset left on screen, far post offset right → looks 3D
      const nBN = proj(0, 0,   -TZ), nBF = proj(0, 0,    TZ);
      const nTN = proj(0, -NH, -TZ), nTF = proj(0, -NH,  TZ);

      // Net panel fill
      const nG = ctx.createLinearGradient(nTN.sx, nTN.sy, nBN.sx, nBN.sy);
      nG.addColorStop(0, 'rgba(150,172,255,0.28)'); nG.addColorStop(1, 'rgba(60,90,195,0.04)');
      poly([nBN, nBF, nTF, nTN], nG);

      // Horizontal mesh lines
      for (let r = 0; r <= 5; r++) {
        const nY = -NH * (1 - r / 5);
        ln(proj(0, nY, -TZ), proj(0, nY, TZ), `rgba(142,162,248,${0.08+r*0.014})`, 0.8);
      }
      // Vertical mesh lines — converge in perspective (key 3D cue)
      for (let c = 0; c <= 8; c++) {
        const wz = -TZ + c * (TZ * 2 / 8);
        ln(proj(0, 0, wz), proj(0, -NH, wz), 'rgba(118,142,235,0.11)', 0.9);
      }

      // Posts (near = brighter/bigger, far = dimmer = depth)
      ctx.save(); ctx.shadowBlur = 0;
      ln(nBN, nTN, 'rgba(200,218,255,0.80)', 2.2);
      ln(nBF, nTF, 'rgba(200,218,255,0.48)', 1.5);
      ctx.restore();

      // Top bar — glowing
      ctx.save(); ctx.shadowBlur = 7; ctx.shadowColor = 'rgba(180,212,255,0.92)';
      ln(nTN, nTF, 'rgba(235,246,255,0.96)', 2.5);
      ctx.restore();

      // ── BALL ──
      const bp   = ballAt(progress);
      const bPos = proj(bp.x, bp.y, 0);
      const bR   = 6.5 * bPos.s;

      // Ground shadow
      const bSh = proj(bp.x, 0, 0);
      const sA  = 0.22 * (1 - Math.abs(bp.y) / 75 * 0.80);
      ctx.beginPath();
      ctx.ellipse(bSh.sx, bSh.sy, bR * 1.7, bR * 0.37 * bSh.s, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40, 70, 200, ${sA})`; ctx.fill();

      // Ghost trail
      const tP = (progress - 0.024 + 1) % 1;
      const tb  = ballAt(tP);
      const tPos = proj(tb.x, tb.y, 0);
      ctx.beginPath(); ctx.arc(tPos.sx, tPos.sy, 4.2 * tPos.s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(175,198,255,0.08)'; ctx.fill();

      // Main ball
      ctx.save();
      ctx.shadowBlur = 14 * bPos.s; ctx.shadowColor = 'rgba(255,255,255,0.88)';
      const bG = ctx.createRadialGradient(bPos.sx-bR*.30, bPos.sy-bR*.30, 0, bPos.sx, bPos.sy, bR);
      bG.addColorStop(0, '#ffffff'); bG.addColorStop(.48, '#d4d9f7'); bG.addColorStop(1, '#98a0db');
      ctx.beginPath(); ctx.arc(bPos.sx, bPos.sy, bR, 0, Math.PI * 2);
      ctx.fillStyle = bG; ctx.fill();
      ctx.restore();

      // ── PADDLES ──
      drawPaddle(-PX, progress, true);
      drawPaddle( PX, progress, false);
    };

    // Paddle: single clean 3D disc projected via canvas transform
    // No separate glow ring in screen-space → no double circle
    const drawPaddle = (px, progress, isLeft) => {
      const hitT    = isLeft
        ? Math.min(progress, 1 - progress) * 2
        : Math.abs(progress - 0.5) * 2;
      const hitting = hitT < 0.07;
      const bump    = hitting ? 1 + (1 - hitT / 0.07) * 0.10 : 1;
      const rb      = PR * bump;

      // Project the disc centre + two axis endpoints to get screen-space axes
      const pc   = proj(px, PY, 0);
      // Y-axis of disc (pointing up in world)
      const pTop = proj(px, PY - rb, 0);
      // Z-axis of disc (pointing toward camera in world)
      const pFwd = proj(px, PY, -rb);

      const ax1x = pTop.sx - pc.sx, ax1y = pTop.sy - pc.sy;  // up
      const ax2x = pFwd.sx - pc.sx, ax2y = pFwd.sy - pc.sy;  // depth (foreshortened)

      ctx.save();
      ctx.translate(pc.sx, pc.sy);
      // Map unit circle → projected 3D ellipse
      ctx.transform(ax1x, ax1y, ax2x, ax2y, 0, 0);

      // Outer glow halo (1.08 → single ring, part of disc)
      const glowAlpha = hitting ? 0.55 : 0.22;
      const glowColor = hitting ? `rgba(165,182,252,${glowAlpha})` : `rgba(120,142,248,${glowAlpha})`;
      ctx.beginPath(); ctx.arc(0, 0, 1.08, 0, Math.PI * 2);
      ctx.fillStyle = glowColor; ctx.fill();

      // Dark paddle body
      const bodyG = ctx.createRadialGradient(-0.15, -0.20, 0, 0, 0, 1);
      bodyG.addColorStop(0,   '#28284e');
      bodyG.addColorStop(0.75,'#141428');
      bodyG.addColorStop(1,   '#0b0b1e');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fillStyle = bodyG; ctx.fill();

      // Rim
      ctx.strokeStyle = hitting ? 'rgba(175,192,252,0.95)' : 'rgba(125,145,248,0.62)';
      ctx.lineWidth   = 0.06;
      ctx.beginPath(); ctx.arc(0, 0, 0.96, 0, Math.PI * 2); ctx.stroke();

      // Rubber face — inner disc
      const rubG = ctx.createRadialGradient(-0.12, -0.16, 0, 0, 0, 0.52);
      rubG.addColorStop(0,   hitting ? '#dce8ff' : '#c0d0ff');
      rubG.addColorStop(0.65, hitting ? 'rgba(155,175,252,0.95)' : 'rgba(140,162,250,0.88)');
      rubG.addColorStop(1,    'rgba(95,118,218,0.78)');
      ctx.beginPath(); ctx.arc(0, 0, 0.52, 0, Math.PI * 2);
      ctx.fillStyle = rubG; ctx.fill();

      // Subtle horizontal grip lines on rubber
      ctx.lineWidth = 0.04;
      ctx.strokeStyle = 'rgba(65,88,188,0.35)';
      for (const ly of [-0.30, 0, 0.30]) {
        const hw = Math.sqrt(Math.max(0, 0.52*0.52 - ly*ly)) * 0.9;
        ctx.beginPath(); ctx.moveTo(-hw, ly); ctx.lineTo(hw, ly); ctx.stroke();
      }

      ctx.restore();

      // Handle — below the disc, slight angle for depth
      const hTop = proj(px, PY + rb * 0.88, 0);
      const hBot = proj(px, PY + rb * 0.88 + 16, 1.5);
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(42,52,98,0.70)'; ctx.lineWidth = 5.2 * pc.s;
      ctx.beginPath(); ctx.moveTo(hTop.sx, hTop.sy); ctx.lineTo(hBot.sx, hBot.sy); ctx.stroke();
      ctx.strokeStyle = 'rgba(75,90,150,0.78)'; ctx.lineWidth = 2.8 * pc.s;
      ctx.beginPath(); ctx.moveTo(hTop.sx, hTop.sy); ctx.lineTo(hBot.sx, hBot.sy); ctx.stroke();
      ctx.lineCap = 'butt'; ctx.restore();
    };

    const loop = (ts) => {
      if (!t0.current) t0.current = ts;
      draw(((ts - t0.current) % CYCLE) / CYCLE);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); t0.current = null; };
  }, [chaosMode]);

  return (
    <canvas ref={ref} width={560} height={150}
      style={{ display: 'block', width: '100%', maxWidth: 560, height: 'auto' }} />
  );
}

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
    return () => { clearInterval(tickTimer.current); clearTimeout(chaosTimer.current); clearTimeout(clickTimer.current); };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const handleTitleClick = () => {
    clickCount.current += 1; clearTimeout(clickTimer.current);
    if (clickCount.current >= 5) { clickCount.current = 0; activateChaos(); }
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
  };
  const activateChaos = () => {
    setChaosMode(true);
    const pool = ['🏓','⚡','💀','🎮','💥','⚠️','🔥','🎯','💣','🌪️'];
    setConfetti(Array.from({ length: 40 }, (_, i) => ({
      id: i, emoji: pool[Math.floor(Math.random() * pool.length)],
      x: Math.random()*100, delay: Math.random()*1.2, dur: 1.8+Math.random()*1.5,
      size: 18+Math.random()*24, rotate: Math.random()*360, drift: (Math.random()-.5)*120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: 'var(--cyber-text-dim)' }}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );

  return (
    <>
      <style>{CSS}</style>
      {chaosMode && confetti.map(c => (
        <div key={c.id} className="fixed pointer-events-none z-50"
          style={{ left:`${c.x}%`,top:0,fontSize:`${c.size}px`,
            animation:`confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift':`${c.drift}px`,transform:`rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}
      {chaosMode && <div className="fixed inset-0 pointer-events-none" style={{ zIndex:49,
        animation:'chaosFlash 0.6s ease-out forwards',
        background:'radial-gradient(ellipse at 50% 30%,rgba(129,140,248,.1) 0%,transparent 70%)' }}/>}

      <header style={{ position:'relative',overflow:'hidden',
        background:'linear-gradient(180deg,#060609 0%,#0a0a0f 100%)',borderBottom:'1px solid #1a1a2e' }}>
        <div style={{ position:'absolute',top:0,left:0,width:70,height:2,background:'#818cf8',boxShadow:'0 0 10px rgba(129,140,248,.7)',zIndex:2 }}/>
        <div style={{ position:'absolute',top:0,right:0,width:70,height:2,background:'#818cf8',boxShadow:'0 0 10px rgba(129,140,248,.7)',zIndex:2 }}/>
        <div style={{ position:'absolute',top:0,left:0,width:2,height:44,background:'linear-gradient(to bottom,#818cf8,transparent)',zIndex:2 }}/>
        <div style={{ position:'absolute',top:0,right:0,width:2,height:44,background:'linear-gradient(to bottom,#818cf8,transparent)',zIndex:2 }}/>

        <div style={{ position:'relative',zIndex:10,display:'flex',alignItems:'center',
          justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid #12121e' }}>
          <button onClick={handleCopy} style={{ display:'flex',alignItems:'center',gap:'8px',
            background:'#08080d',border:'1px solid #252535',padding:'7px 12px',cursor:'pointer',
            transition:'all .18s',clipPath:'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
            <Smartphone size={14} style={{ color:'var(--cyber-text-dim)' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,
              letterSpacing:'.18em',color:'#818cf8',padding:'2px 6px',
              background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.25)' }}>BLIK</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:'.9rem',letterSpacing:'.06em',color:'#e0e0e0' }}>{blikNumber}</span>
            <div style={{ width:1,height:14,background:'#252535',margin:'0 2px' }}/>
            {copied ? <Check size={13} style={{ color:'var(--cyber-green)' }}/> : <CopyIcon/>}
          </button>
          <button onClick={() => setIsMuted(!isMuted)} style={{ display:'flex',alignItems:'center',
            justifyContent:'center',width:36,height:36,cursor:'pointer',transition:'all .18s',
            border:isMuted?'1px solid rgba(255,0,51,.5)':'1px solid #252535',
            color:isMuted?'var(--cyber-red)':'var(--cyber-text-dim)',
            background:isMuted?'rgba(255,0,51,.08)':'transparent',
            clipPath:'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}>
            {isMuted ? <VolumeX size={17}/> : <Volume2 size={17}/>}
          </button>
        </div>

        <div style={{ position:'relative',zIndex:10,padding:'18px 16px 22px',
          display:'flex',flexDirection:'column',alignItems:'center' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px' }}>
            <div style={{ height:1,width:36,background:'linear-gradient(to right,transparent,rgba(129,140,248,.5))' }}/>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:600,
              letterSpacing:'.28em',color:'rgba(129,140,248,.55)',textTransform:'uppercase' }}>CENTRUM DOWODZENIA</span>
            <div style={{ height:1,width:36,background:'linear-gradient(to left,transparent,rgba(129,140,248,.5))' }}/>
          </div>

          <div style={{ width:'100%',maxWidth:560,marginBottom:14,
            filter:chaosMode?'none':'drop-shadow(0 0 20px rgba(70,98,255,.15))' }}>
            <Arena chaosMode={chaosMode}/>
          </div>

          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background:'transparent',border:'none',padding:0,cursor:'pointer' }}>
            <span style={{ display:'block',fontFamily:'var(--font-display)',fontWeight:900,
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:'.06em',lineHeight:1,textAlign:'center',
              ...(chaosMode
                ? {color:'#a5b4fc',animation:'headerBounce .4s ease-in-out 3',textShadow:'0 0 30px rgba(129,140,248,.8),2px 2px 0 rgba(0,0,0,.9)'}
                : {color:'#c7d2fe',textShadow:'0 0 30px rgba(129,140,248,.2),2px 2px 0 rgba(0,0,0,.95)'}) }}>
              PING-PONG
            </span>
          </button>

          <div style={{ width:'100%',maxWidth:'22rem',height:1,margin:'14px 0 10px',
            background:'linear-gradient(90deg,transparent,rgba(129,140,248,.3) 50%,transparent)' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:600,
              letterSpacing:'.2em',textTransform:'uppercase',transition:'color .15s,text-shadow .15s',
              color:tick?'#818cf8':'rgba(129,140,248,.1)',textShadow:tick?'0 0 10px rgba(129,140,248,.7)':'none' }}>⚡ JACK IN ⚡</span>
            <span style={{ color:'#1a1a2e' }}>│</span>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,letterSpacing:'.1em',
              color:isConnected?'var(--cyber-green)':'var(--cyber-red)',
              textShadow:isConnected?'0 0 8px var(--cyber-green)':'0 0 8px var(--cyber-red)' }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color:'#1a1a2e' }}>│</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:'.68rem',color:'var(--cyber-text-dim)' }}>v2.0.77</span>
          </div>
        </div>
      </header>

      <div style={{ height:2,background:'linear-gradient(90deg,transparent,#818cf8 30%,#818cf8 70%,transparent)',opacity:.5 }}/>

      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{ background:'transparent',border:'none',padding:0,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
          <span style={{ fontSize:'.9rem' }}>🏓</span>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,letterSpacing:'.15em',color:'#818cf8',padding:'2px 5px',background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.2)' }}>BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)',color:'#e0e0e0',fontSize:'.85rem',letterSpacing:'.06em' }}>{blikNumber}</span>
          {copied ? <Check size={12} style={{ color:'var(--cyber-green)' }}/> : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--cyber-text-dim)' }}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
        </button>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,letterSpacing:'.08em',color:isConnected?'var(--cyber-green)':'var(--cyber-red)' }}>{isConnected ? '● ONLINE' : '○ OFFLINE'}</span>
          <button onClick={() => setIsMuted(!isMuted)} style={{ display:'flex',alignItems:'center',border:isMuted?'1px solid rgba(255,0,51,.4)':'1px solid #252535',color:isMuted?'var(--cyber-red)':'var(--cyber-text-dim)',background:'transparent',padding:'4px 6px',cursor:'pointer',clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>
            {isMuted ? <VolumeX size={15}/> : <Volume2 size={15}/>}
          </button>
        </div>
      </div>
    </>
  );
}
