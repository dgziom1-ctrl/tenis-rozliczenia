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

    const W = 560, H = 150;
    const CX = W / 2, CY = 72;
    const RX  = 34 * Math.PI / 180;
    const cos = Math.cos(RX), sin = Math.sin(RX);
    const FOV = 390, DIST = 285;

    const TX = 108, TZ = 42;
    const NH = 21, THICK = 5;
    const PR = 19, PX = 132;
    const PY = -21;
    const CYCLE = 2300;

    const KF = [
      { t: 0.00, x: -PX, y: PY   },
      { t: 0.20, x: -46, y: 0    },
      { t: 0.50, x:  PX, y: PY   },
      { t: 0.70, x:  46, y: 0    },
      { t: 1.00, x: -PX, y: PY   },
    ];
    const CP = [
      { x: -84, y: -28 },
      { x:   0, y: -78 },
      { x:  84, y: -28 },
      { x:   0, y: -78 },
    ];

    const proj = (x, y, z) => {
      const y2 = y * cos - z * sin;
      const z2 = y * sin + z * cos;
      const s  = FOV / (z2 + DIST);
      return { sx: CX + x * s, sy: CY + y2 * s, s };
    };

    const ballAt = (p) => {
      let i = KF.length - 2;
      for (let j = 0; j < KF.length - 1; j++) {
        if (p >= KF[j].t && p <= KF[j+1].t) { i = j; break; }
      }
      const tl = (p - KF[i].t) / (KF[i+1].t - KF[i].t);
      const mt = 1 - tl;
      const { x: x0, y: y0 } = KF[i];
      const { x: x2, y: y2 } = KF[i+1];
      const { x: x1, y: y1 } = CP[i];
      return {
        x: x0*mt*mt + x1*2*mt*tl + x2*tl*tl,
        y: y0*mt*mt + y1*2*mt*tl + y2*tl*tl,
      };
    };

    const ln = (a, b, col, w) => {
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    };
    const quad = (pts, fill) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      pts.slice(1).forEach(p => ctx.lineTo(p.sx, p.sy));
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    };

    const draw = (progress) => {
      ctx.clearRect(0, 0, W, H);

      const tFL = proj(-TX, 0, -TZ), tFR = proj( TX, 0, -TZ);
      const tBR = proj( TX, 0,  TZ), tBL = proj(-TX, 0,  TZ);

      const topG = ctx.createLinearGradient(tBL.sx, tBL.sy, tFL.sx, tFL.sy);
      topG.addColorStop(0, '#06091f');
      topG.addColorStop(1, '#121e58');
      quad([tFL, tFR, tBR, tBL], topG);

      for (let i = 1; i <= 3; i++) {
        const fz = i / 4;
        const wz = -TZ + fz * TZ * 2;
        ln(proj(-TX, 0, wz), proj(TX, 0, wz), `rgba(100,130,255,${0.06 + i*0.01})`, 0.8);
      }

      ctx.save(); ctx.shadowBlur = 0;
      ln(tBL, tFL, 'rgba(100,135,255,0.65)', 1.5);
      ln(tBR, tFR, 'rgba(100,135,255,0.65)', 1.5);
      ln(tBL, tBR, 'rgba(100,135,255,0.22)', 1);
      ctx.restore();

      ln(proj(0, 0, -TZ), proj(0, 0, TZ), 'rgba(175,200,255,0.13)', 1);

      const tFL2 = proj(-TX, THICK, -TZ), tFR2 = proj(TX, THICK, -TZ);
      const faceG = ctx.createLinearGradient(0, tFL.sy, 0, tFL2.sy);
      faceG.addColorStop(0, 'rgba(75,110,230,0.55)');
      faceG.addColorStop(1, 'rgba(30,55,165,0.08)');
      quad([tFL, tFR, tFR2, tFL2], faceG);

      ctx.save();
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(110,150,255,0.6)';
      ln(tFL, tFR, 'rgba(155,185,255,0.92)', 1.8);
      ctx.restore();

      const nBN = proj(0, 0,    -TZ), nBF = proj(0, 0,    TZ);
      const nTN = proj(0, -NH,  -TZ), nTF = proj(0, -NH,  TZ);

      const netG = ctx.createLinearGradient(nTN.sx, nTN.sy, nBN.sx, nBN.sy);
      netG.addColorStop(0, 'rgba(158,178,255,0.30)');
      netG.addColorStop(1, 'rgba(65,95,200,0.05)');
      quad([nBN, nBF, nTF, nTN], netG);

      for (let r = 0; r <= 5; r++) {
        const fy  = r / 5;
        const nY  = -NH * (1 - fy);
        const alp = 0.10 + r * 0.015;
        ln(proj(0, nY, -TZ), proj(0, nY, TZ), `rgba(148,168,252,${alp})`, 0.9);
      }
      for (let c = 0; c <= 10; c++) {
        const wz = -TZ + c * (TZ * 2 / 10);
        ln(proj(0, 0, wz), proj(0, -NH, wz), 'rgba(125,148,238,0.13)', 0.9);
      }

      ctx.save(); ctx.shadowBlur = 0;
      ln(nBN, nTN, 'rgba(205,222,255,0.82)', 2.2);
      ln(nBF, nTF, 'rgba(205,222,255,0.52)', 1.6);
      ctx.restore();

      ctx.save();
      ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(185,215,255,0.95)';
      ln(nTN, nTF, 'rgba(238,248,255,0.97)', 2.6);
      ctx.restore();

      const bp   = ballAt(progress);
      const bPos = proj(bp.x, bp.y, 0);
      const bR   = 6.8 * bPos.s;

      const bSh = proj(bp.x, 0, 0);
      const sA  = 0.25 * (1 - Math.abs(bp.y) / 78 * 0.82);
      ctx.beginPath();
      ctx.ellipse(bSh.sx, bSh.sy, bR * 1.75, bR * 0.38 * bSh.s, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(45, 75, 200, ${sA})`; ctx.fill();

      const tP = (progress - 0.025 + 1) % 1;
      const tb = ballAt(tP);
      const tPos = proj(tb.x, tb.y, 0);
      ctx.beginPath(); ctx.arc(tPos.sx, tPos.sy, 4.5 * tPos.s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,200,255,0.09)'; ctx.fill();

      ctx.save();
      ctx.shadowBlur = 15 * bPos.s; ctx.shadowColor = 'rgba(255,255,255,0.9)';
      const ballG = ctx.createRadialGradient(
        bPos.sx - bR*.32, bPos.sy - bR*.32, 0, bPos.sx, bPos.sy, bR
      );
      ballG.addColorStop(0,  '#ffffff');
      ballG.addColorStop(.5, '#d5d9f8');
      ballG.addColorStop(1,  '#9aa0dc');
      ctx.beginPath(); ctx.arc(bPos.sx, bPos.sy, bR, 0, Math.PI * 2);
      ctx.fillStyle = ballG; ctx.fill();
      ctx.restore();

      drawPaddle(-PX, progress, true);
      drawPaddle( PX, progress, false);
    };

    const drawPaddle = (px, progress, isLeft) => {
      const hitT    = isLeft
        ? Math.min(progress, 1 - progress) * 2
        : Math.abs(progress - 0.5) * 2;
      const hitting = hitT < 0.08;
      const bump    = hitting ? 1 + (1 - hitT / 0.08) * 0.11 : 1;
      const rb      = PR * bump;

      const pc  = proj(px, PY, 0);
      const pty = proj(px, PY - rb, 0);
      const pfz = proj(px, PY, -rb);

      const ax1x = pty.sx - pc.sx, ax1y = pty.sy - pc.sy;
      const ax2x = pfz.sx - pc.sx, ax2y = pfz.sy - pc.sy;
      const sR   = Math.hypot(ax1x, ax1y);

      ctx.save();
      ctx.shadowBlur  = hitting ? 26 : 12;
      ctx.shadowColor = hitting ? 'rgba(165,180,252,0.92)' : 'rgba(129,140,248,0.52)';
      ctx.strokeStyle = hitting ? 'rgba(165,180,252,0.68)' : 'rgba(129,140,248,0.38)';
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.arc(pc.sx, pc.sy, sR * 1.06, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(pc.sx, pc.sy);
      ctx.transform(ax1x, ax1y, ax2x, ax2y, 0, 0);

      ctx.beginPath(); ctx.arc(0, 0, 1.06, 0, Math.PI * 2);
      ctx.fillStyle = hitting ? 'rgba(129,140,248,0.38)' : 'rgba(129,140,248,0.16)';
      ctx.fill();

      const bodyG = ctx.createRadialGradient(-0.18, -0.22, 0, 0, 0, 1);
      bodyG.addColorStop(0,   '#2c2c54');
      bodyG.addColorStop(.78, '#161630');
      bodyG.addColorStop(1,   '#0d0d24');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fillStyle = bodyG; ctx.fill();

      ctx.strokeStyle = hitting ? 'rgba(170,185,252,0.95)' : 'rgba(129,140,248,0.68)';
      ctx.lineWidth   = 0.055;
      ctx.beginPath(); ctx.arc(0, 0, 0.962, 0, Math.PI * 2); ctx.stroke();

      const rubG = ctx.createRadialGradient(-0.14, -0.18, 0, 0, 0, 0.54);
      rubG.addColorStop(0,   hitting ? 'rgba(218,228,255,1)' : 'rgba(195,208,255,0.97)');
      rubG.addColorStop(.68, hitting ? 'rgba(160,178,252,0.95)' : 'rgba(148,165,250,0.9)');
      rubG.addColorStop(1,   'rgba(100,120,222,0.8)');
      ctx.beginPath(); ctx.arc(0, 0, 0.54, 0, Math.PI * 2);
      ctx.fillStyle = rubG; ctx.fill();

      ctx.beginPath(); ctx.arc(0, 0, 0.17, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(78,98,195,0.38)'; ctx.fill();

      ctx.lineWidth = 0.038;
      for (const ly of [-0.93, -0.76, -0.63,  0.63, 0.76, 0.91]) {
        const hw = Math.sqrt(Math.max(0, 1 - ly * ly)) * 0.94;
        ctx.strokeStyle = 'rgba(70,90,182,0.38)';
        ctx.beginPath(); ctx.moveTo(-hw, ly); ctx.lineTo(hw, ly); ctx.stroke();
      }

      ctx.restore();

      const hS = proj(px, PY + rb * 0.94 + 1,  0);
      const hE = proj(px, PY + rb * 0.94 + 18, 2);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(50,60,105,0.65)';
      ctx.lineWidth   = 5.5 * pc.s;
      ctx.beginPath(); ctx.moveTo(hS.sx, hS.sy); ctx.lineTo(hE.sx, hE.sy); ctx.stroke();
      ctx.strokeStyle = 'rgba(82,96,158,0.82)';
      ctx.lineWidth   = 3 * pc.s;
      ctx.beginPath(); ctx.moveTo(hS.sx, hS.sy); ctx.lineTo(hE.sx, hE.sy); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();
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
    <canvas
      ref={ref}
      width={560}
      height={150}
      style={{ display: 'block', width: '100%', maxWidth: 560, height: 'auto' }}
    />
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
    return () => {
      clearInterval(tickTimer.current);
      clearTimeout(chaosTimer.current);
      clearTimeout(clickTimer.current);
    };
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
    const pool = ['🏓','⚡','💀','🎮','💥','⚠️','🔥','🎯','💣','🌪️'];
    setConfetti(Array.from({ length: 40 }, (_, i) => ({
      id: i, emoji: pool[Math.floor(Math.random() * pool.length)],
      x: Math.random() * 100, delay: Math.random() * 1.2,
      dur: 1.8 + Math.random() * 1.5, size: 18 + Math.random() * 24,
      rotate: Math.random() * 360, drift: (Math.random() - .5) * 120,
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
          style={{ left:`${c.x}%`, top:0, fontSize:`${c.size}px`,
            animation:`confettiBurst ${c.dur}s ${c.delay}s cubic-bezier(.2,.8,.4,1) forwards`,
            '--drift':`${c.drift}px`, transform:`rotate(${c.rotate}deg)` }}>
          {c.emoji}
        </div>
      ))}
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex:49,
          animation:'chaosFlash 0.6s ease-out forwards',
          background:'radial-gradient(ellipse at 50% 30%,rgba(129,140,248,.1) 0%,transparent 70%)' }}/>
      )}

      <header style={{ position:'relative', overflow:'hidden',
        background:'linear-gradient(180deg,#060609 0%,#0a0a0f 100%)',
        borderBottom:'1px solid #1a1a2e' }}>

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
            <span style={{ fontFamily:'var(--font-mono)',fontSize:'.9rem',letterSpacing:'.06em',color:'#e0e0e0' }}>
              {blikNumber}
            </span>
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
              letterSpacing:'.28em',color:'rgba(129,140,248,.55)',textTransform:'uppercase' }}>
              CENTRUM DOWODZENIA
            </span>
            <div style={{ height:1,width:36,background:'linear-gradient(to left,transparent,rgba(129,140,248,.5))' }}/>
          </div>

          <div style={{ width:'100%',maxWidth:560,marginBottom:14,
            filter:chaosMode?'none':'drop-shadow(0 0 20px rgba(75,100,255,.16))' }}>
            <Arena chaosMode={chaosMode}/>
          </div>

          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background:'transparent',border:'none',padding:0,cursor:'pointer' }}>
            <span style={{
              display:'block',fontFamily:'var(--font-display)',fontWeight:900,
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:'.06em',lineHeight:1,textAlign:'center',
              ...(chaosMode
                ? { color:'#a5b4fc', animation:'headerBounce .4s ease-in-out 3',
                    textShadow:'0 0 30px rgba(129,140,248,.8),2px 2px 0 rgba(0,0,0,.9)' }
                : { color:'#c7d2fe',
                    textShadow:'0 0 30px rgba(129,140,248,.2),2px 2px 0 rgba(0,0,0,.95)' }),
            }}>PING-PONG</span>
          </button>

          <div style={{ width:'100%',maxWidth:'22rem',height:1,margin:'14px 0 10px',
            background:'linear-gradient(90deg,transparent,rgba(129,140,248,.3) 50%,transparent)' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:600,
              letterSpacing:'.2em',textTransform:'uppercase',transition:'color .15s,text-shadow .15s',
              color:tick?'#818cf8':'rgba(129,140,248,.1)',
              textShadow:tick?'0 0 10px rgba(129,140,248,.7)':'none' }}>⚡ JACK IN ⚡</span>
            <span style={{ color:'#1a1a2e' }}>│</span>
            <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,
              letterSpacing:'.1em',
              color:isConnected?'var(--cyber-green)':'var(--cyber-red)',
              textShadow:isConnected?'0 0 8px var(--cyber-green)':'0 0 8px var(--cyber-red)' }}>
              {isConnected ? '● ONLINE' : '○ OFFLINE'}
            </span>
            <span style={{ color:'#1a1a2e' }}>│</span>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:'.68rem',color:'var(--cyber-text-dim)' }}>
              v2.0.77
            </span>
          </div>
        </div>
      </header>

      <div style={{ height:2,background:'linear-gradient(90deg,transparent,#818cf8 30%,#818cf8 70%,transparent)',opacity:.5 }}/>

      <div className={`compact-header ${scrolled ? 'visible-bar' : 'hidden-bar'}`}>
        <button onClick={handleCopy} style={{ background:'transparent',border:'none',padding:0,cursor:'pointer',
          display:'flex',alignItems:'center',gap:'6px' }}>
          <span style={{ fontSize:'.9rem' }}>🏓</span>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,
            letterSpacing:'.15em',color:'#818cf8',padding:'2px 5px',
            background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.2)' }}>BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)',color:'#e0e0e0',fontSize:'.85rem',letterSpacing:'.06em' }}>
            {blikNumber}
          </span>
          {copied
            ? <Check size={12} style={{ color:'var(--cyber-green)' }}/>
            : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color:'var(--cyber-text-dim)' }}>
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>}
        </button>
        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,
            letterSpacing:'.08em',color:isConnected?'var(--cyber-green)':'var(--cyber-red)' }}>
            {isConnected ? '● ONLINE' : '○ OFFLINE'}
          </span>
          <button onClick={() => setIsMuted(!isMuted)} style={{ display:'flex',alignItems:'center',
            border:isMuted?'1px solid rgba(255,0,51,.4)':'1px solid #252535',
            color:isMuted?'var(--cyber-red)':'var(--cyber-text-dim)',
            background:'transparent',padding:'4px 6px',cursor:'pointer',
            clipPath:'polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)' }}>
            {isMuted ? <VolumeX size={15}/> : <Volume2 size={15}/>}
          </button>
        </div>
      </div>
    </>
  );
}
