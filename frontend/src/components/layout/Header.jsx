import { Volume2, VolumeX, Smartphone, Check } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

const CSS = `
@keyframes confettiBurst{0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) translateX(var(--drift)) rotate(720deg);opacity:0}}
@keyframes chaosFlash{0%{opacity:1}100%{opacity:0}}
@keyframes headerBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
`;

/* ═══════════════════════════════════════════════════
   3D Arena — canvas, real perspective, yaw+pitch cam
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

    // Camera: 27° tilt (pitch) + 20° yaw
    const RX = 0.471, RY = -0.349;
    const cX = Math.cos(RX), sX = Math.sin(RX);
    const cY = Math.cos(RY), sY = Math.sin(RY);
    const FOV = 370, DIST = 290;

    const TX = 106, TZ = 36, NH = 19, TH = 5;
    const PR = 16,  PX = 122, PY = -21, CYCLE = 2400;

    /* Projection: yaw(Y) then pitch(X) */
    const proj = (x, y, z) => {
      const x1 = x*cY + z*sY,  z1 = -x*sY + z*cY;
      const y2 = y*cX - z1*sX, z2 =  y*sX + z1*cX;
      const s = FOV / (z2 + DIST);
      return [CX + x1*s, CY + y2*s, s];
    };

    /*
     * FIXED BALL TRAJECTORY
     * ──────────────────────
     * Ping pong rule: ball bounces on the OPPONENT's side of the table.
     *
     * KF: [ x, y, t ]
     *   t=0.00 → left  paddle hits  (x = -PX)
     *   t=0.28 → ball bounces RIGHT side (+65) — opponent's half when hit from left
     *   t=0.50 → right paddle hits  (x = +PX)
     *   t=0.78 → ball bounces LEFT  side (-65) — opponent's half when hit from right
     *   t=1.00 → left  paddle hits  (x = -PX, same as t=0)
     *
     * CP: quadratic bezier control points per segment.
     *   Segments 0 & 2: high arc over the net   → CP at x≈0, y=-68
     *   Segments 1 & 3: short rise into paddle  → CP nudged toward paddle
     */
    const KF = [
      [-PX, PY,  0.00],   // left  paddle
      [ 65,  0,  0.28],   // bounce — RIGHT half (opponent of left player)
      [ PX, PY,  0.50],   // right paddle
      [-65,  0,  0.78],   // bounce — LEFT  half (opponent of right player)
      [-PX, PY,  1.00],   // left  paddle (loop)
    ];
    const CP = [
      [  0, -68],   // seg 0: left paddle → right bounce  (high arc over net)
      [ 85, -28],   // seg 1: right bounce → right paddle (low approach)
      [  0, -68],   // seg 2: right paddle → left bounce  (high arc over net)
      [-85, -28],   // seg 3: left bounce  → left paddle  (low approach)
    ];

    const ballAt = (t) => {
      let i = 3;
      for (let j = 0; j < 4; j++) {
        if (t >= KF[j][2] && t <= KF[j+1][2]) { i = j; break; }
      }
      const tl = (t - KF[i][2]) / (KF[i+1][2] - KF[i][2]);
      const mt = 1 - tl;
      return [
        KF[i][0]*mt*mt + CP[i][0]*2*mt*tl + KF[i+1][0]*tl*tl,
        KF[i][1]*mt*mt + CP[i][1]*2*mt*tl + KF[i+1][1]*tl*tl,
      ];
    };

    /* Helpers */
    const quad = (pts, fill) => {
      g.beginPath();
      pts.forEach(([sx,sy], i) => i ? g.lineTo(sx, sy) : g.moveTo(sx, sy));
      g.closePath(); g.fillStyle = fill; g.fill();
    };
    const seg = ([ax,ay],[bx,by], col, w) => {
      g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by);
      g.strokeStyle = col; g.lineWidth = w; g.stroke();
    };
    const ellipse = (cx, cy, rx, ry, rot) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(rot || 0);
      g.scale(1, ry / Math.max(rx, 0.1));
      g.beginPath(); g.arc(0, 0, Math.max(rx, 0.1), 0, Math.PI*2);
      g.restore();
    };

    const HIT_T = 0.09;
    let lastHitState = false;

    /* ── DRAW FRAME ── */
    const draw = (progress) => {
      g.clearRect(0, 0, W, H);

      /* Hit detection — driven by distance to each paddle's hit time */
      const leftHitT  = Math.min(progress, 1 - progress) * 2;   // 0 at t=0 & t=1
      const rightHitT = Math.abs(progress - 0.5) * 2;           // 0 at t=0.5
      const isHitting = leftHitT < HIT_T || rightHitT < HIT_T;
      if (isHitting !== lastHitState) {
        lastHitState = isHitting;
        onHit?.(isHitting);
      }

      /* Table */
      const FL=proj(-TX,0,-TZ), FR=proj(TX,0,-TZ);
      const BR=proj(TX,0,TZ),   BL=proj(-TX,0,TZ);
      const tg = g.createLinearGradient(BL[0],BL[1],FL[0],FL[1]);
      tg.addColorStop(0,'#06091d'); tg.addColorStop(1,'#0f1a50');
      quad([FL,FR,BR,BL], tg);

      /* Grid on table surface */
      for (let i = 1; i < 4; i++) {
        const wz = -TZ + (i/4)*TZ*2;
        seg(proj(-TX,0,wz), proj(TX,0,wz), `rgba(80,110,230,${0.04+i*0.013})`, 0.8);
      }
      for (let i = 1; i < 5; i++) {
        const wx = -TX + (i/5)*TX*2;
        seg(proj(wx,0,-TZ), proj(wx,0,TZ), 'rgba(70,100,215,0.05)', 0.7);
      }

      /* Table edges */
      seg(BL, FL, 'rgba(88,122,242,0.60)', 1.5);
      seg(BR, FR, 'rgba(88,122,242,0.60)', 1.5);
      seg(BL, BR, 'rgba(78,108,215,0.22)', 1.0);
      seg(proj(0,0,-TZ), proj(0,0,TZ), 'rgba(158,178,252,0.11)', 1);

      /* Table front face */
      const FL2=proj(-TX,TH,-TZ), FR2=proj(TX,TH,-TZ);
      const fg = g.createLinearGradient(0,FL[1],0,FL2[1]);
      fg.addColorStop(0,'rgba(62,98,218,0.50)'); fg.addColorStop(1,'rgba(25,48,145,0.06)');
      quad([FL,FR,FR2,FL2], fg);
      g.save(); g.shadowBlur=5; g.shadowColor='rgba(92,138,255,0.52)';
      seg(FL, FR, 'rgba(138,172,255,0.86)', 1.8);
      g.restore();

      /* Net */
      const nBN=proj(0,0,-TZ), nBF=proj(0,0,TZ);
      const nTN=proj(0,-NH,-TZ), nTF=proj(0,-NH,TZ);
      const ng = g.createLinearGradient(nTN[0],nTN[1],nBN[0],nBN[1]);
      ng.addColorStop(0,'rgba(145,165,255,0.22)'); ng.addColorStop(1,'rgba(52,82,192,0.04)');
      quad([nBN,nBF,nTF,nTN], ng);
      for (let r = 0; r <= 4; r++) {
        const ny = -NH*(1-r/4);
        seg(proj(0,ny,-TZ), proj(0,ny,TZ), `rgba(132,155,245,${0.06+r*0.02})`, 0.85);
      }
      for (let c = 0; c <= 8; c++) {
        const wz = -TZ + (c/8)*TZ*2;
        seg(proj(0,0,wz), proj(0,-NH,wz), 'rgba(112,138,228,0.08)', 0.8);
      }
      seg(nBN, nTN, 'rgba(202,220,255,0.80)', 2.2);
      seg(nBF, nTF, 'rgba(198,215,255,0.44)', 1.4);
      g.save(); g.shadowBlur=7; g.shadowColor='rgba(185,212,255,0.90)';
      seg(nTN, nTF, 'rgba(236,246,255,0.96)', 2.5);
      g.restore();

      /* Paddles drawn BEFORE ball (ball always on top) */
      drawPaddle(-PX, progress, true);
      drawPaddle( PX, progress, false);

      /* Ball */
      const bv = ballAt(progress);
      const bq = proj(bv[0], bv[1], 0);
      const bR = 6.4 * bq[2];

      /* Shadow on table */
      const bs = proj(bv[0], 0, 0);
      const sa = Math.max(0, 0.20*(1 - Math.abs(bv[1])/68));
      g.save(); g.translate(bs[0], bs[1]); g.scale(1, 0.34);
      g.beginPath(); g.arc(0, 0, bR*1.55, 0, Math.PI*2);
      g.fillStyle = `rgba(36,62,188,${sa})`; g.fill();
      g.restore();

      /* Ghost trail */
      const tp = (progress-.02+1)%1, tv = ballAt(tp), tq = proj(tv[0],tv[1],0);
      g.beginPath(); g.arc(tq[0], tq[1], 3.6*tq[2], 0, Math.PI*2);
      g.fillStyle = 'rgba(168,190,255,0.07)'; g.fill();

      /* Ball sphere */
      g.save(); g.shadowBlur=13*bq[2]; g.shadowColor='rgba(255,255,255,0.86)';
      const bg = g.createRadialGradient(bq[0]-bR*.3,bq[1]-bR*.3,0, bq[0],bq[1],bR);
      bg.addColorStop(0,'#fff'); bg.addColorStop(.46,'#dadff8'); bg.addColorStop(1,'#9aa0dc');
      g.beginPath(); g.arc(bq[0], bq[1], bR, 0, Math.PI*2);
      g.fillStyle = bg; g.fill();
      g.restore();
    };

    /* ── PADDLE ── */
    const drawPaddle = (px, progress, isLeft) => {
      const hitT    = isLeft ? Math.min(progress,1-progress)*2 : Math.abs(progress-0.5)*2;
      const hitting = hitT < HIT_T;

      /* Normalised distance within hit window: 0=impact edge, 1=impact center */
      const hitNorm = hitting ? 1 - hitT / HIT_T : 0;

      /* ── WINDUP WINDOW: slightly larger than HIT_T ──
         Detect approach phase so we can add a back-swing before the lunge. */
      const WIND_T  = HIT_T * 2.2;
      const isWind  = !hitting && hitT < WIND_T;
      /* windNorm: 0 at edge of windup, 1 at start of hit window */
      const windNorm = isWind ? 1 - (hitT - HIT_T) / (WIND_T - HIT_T) : 0;

      /* ── SWING: forward lunge toward net on impact (cos² ease-out) ── */
      const swingFactor = hitting
        ? Math.pow(Math.cos((hitT / HIT_T) * Math.PI * 0.5), 2)
        : 0;

      /* ── WINDUP: subtle pull-back just before the hit ── */
      const windFactor = isWind
        ? Math.pow(Math.sin(windNorm * Math.PI * 0.5), 2) * 0.45
        : 0;

      /* Combine: lunge forward on hit, slight pull-back during windup */
      const netDir  = isLeft ? 1 : -1;
      const swingX  = px + netDir * (swingFactor * 24 - windFactor * 8);

      /* Y: paddle lunges UP to meet the ball (ball is at PY on impact) */
      const swingY  = swingFactor * 8 + windFactor * 2;   // up = negative Y

      /* 3D tilt: top of paddle leans toward net during swing */
      const tiltZ = isLeft
        ? swingFactor * 11 - windFactor * 3
        : -(swingFactor * 11 - windFactor * 3);

      /* Gentle idle vertical bob — different phase per paddle */
      const bobPhase = isLeft ? 0 : Math.PI * 0.65;
      const bobY = PY - swingY + Math.sin(progress * Math.PI * 4 + bobPhase) * 2.2;

      const bump = hitting ? 1 + swingFactor * 0.15 : 1;
      const R    = PR * bump;

      /* Project cardinal points — top uses tiltZ for forward lean */
      const pc = proj(swingX, bobY, 0);
      const pr = proj(swingX+R, bobY,    0),    pl = proj(swingX-R, bobY, 0);
      const pt = proj(swingX,   bobY-R,  tiltZ), pb = proj(swingX,  bobY+R, -tiltZ * 0.25);

      const cx = (pr[0]+pl[0])/2,  cy = (pt[1]+pb[1])/2;
      const rx = Math.hypot(pr[0]-pl[0], pr[1]-pl[1]) / 2;
      const ry = Math.hypot(pt[0]-pb[0], pt[1]-pb[1]) / 2;
      const ang = Math.atan2(pt[1]-pb[1], pt[0]-pb[0]) + Math.PI/2;

      /* Layer 1: outer glow halo */
      g.save();
      g.shadowBlur  = hitting ? 20 : 8;
      g.shadowColor = hitting ? 'rgba(182,205,255,0.80)' : 'rgba(125,145,250,0.42)';
      g.strokeStyle = hitting ? 'rgba(192,215,255,0.68)' : 'rgba(120,140,245,0.38)';
      g.lineWidth   = 3.5;
      ellipse(cx, cy, rx*1.1, ry*1.1, ang); g.stroke();
      g.restore();

      /* Layer 2: dark body */
      const bdg = g.createRadialGradient(cx-rx*.16,cy-ry*.16,0, cx,cy,Math.max(rx,ry)*1.05);
      bdg.addColorStop(0,'#252456'); bdg.addColorStop(.76,'#12122c'); bdg.addColorStop(1,'#09091e');
      ellipse(cx, cy, rx, ry, ang); g.fillStyle = bdg; g.fill();

      /* Layer 3: rim stroke */
      g.strokeStyle = hitting ? 'rgba(185,208,255,0.88)' : 'rgba(135,155,250,0.62)';
      g.lineWidth   = 1.9;
      ellipse(cx, cy, rx*.95, ry*.95, ang); g.stroke();

      /* Layer 4: rubber face */
      const rfg = g.createRadialGradient(cx-rx*.1,cy-ry*.1,0, cx,cy,rx*.52);
      rfg.addColorStop(0, hitting ? 'rgba(222,232,255,0.96)' : 'rgba(192,208,255,0.92)');
      rfg.addColorStop(1, hitting ? 'rgba(152,175,250,0.86)' : 'rgba(138,158,245,0.78)');
      ellipse(cx, cy, rx*.52, ry*.52, ang); g.fillStyle = rfg; g.fill();

      /* Handle — follows swingX + bobY */
      const hs = proj(swingX, bobY + R/pc[2] + 1,  0);
      const he = proj(swingX, bobY + R/pc[2] + 14, 0);
      g.save(); g.lineCap = 'round';
      g.strokeStyle = 'rgba(44,48,92,0.90)'; g.lineWidth = 4.6*pc[2];
      g.beginPath(); g.moveTo(hs[0],hs[1]); g.lineTo(he[0],he[1]); g.stroke();
      g.strokeStyle = 'rgba(88,104,165,0.70)'; g.lineWidth = 2.1*pc[2];
      g.beginPath(); g.moveTo(hs[0],hs[1]); g.lineTo(he[0],he[1]); g.stroke();
      g.lineCap = 'butt'; g.restore();
    };

    /* RAF loop */
    const loop = (ts) => {
      if (!t0.current) t0.current = ts;
      draw(((ts - t0.current) % CYCLE) / CYCLE);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf.current); t0.current = null; };
  }, [chaosMode, onHit]);

  return (
    <canvas ref={ref} width={560} height={155}
      style={{ display:'block', width:'100%', maxWidth:560, height:'auto' }} />
  );
}

/* ═══════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════ */
export default function Header({ isMuted, setIsMuted, isConnected, scrolled }) {
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
  const handleHit = useCallback((state) => setHitting(state), []);

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
      x: Math.random()*100, delay: Math.random()*1.2,
      dur: 1.8+Math.random()*1.5, size: 18+Math.random()*24,
      rotate: Math.random()*360, drift: (Math.random()-.5)*120,
    })));
    clearTimeout(chaosTimer.current);
    chaosTimer.current = setTimeout(() => { setChaosMode(false); setConfetti([]); }, 4000);
  };

  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color:'var(--cyber-text-dim)' }}>
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
      {chaosMode && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex:49,
          animation:'chaosFlash 0.6s ease-out forwards',
          background:'radial-gradient(ellipse at 50% 30%,rgba(129,140,248,.1) 0%,transparent 70%)' }}/>
      )}

      <header style={{ position:'relative',overflow:'hidden',
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
            <Arena chaosMode={chaosMode} onHit={handleHit}/>
          </div>

          <button onClick={handleTitleClick} aria-label="Ping Pong — kliknij 5x dla niespodzianki"
            style={{ background:'transparent',border:'none',padding:0,cursor:'pointer' }}>
            <span style={{
              display:'block',fontFamily:'var(--font-display)',fontWeight:900,
              fontSize:'clamp(2rem,8vw,4rem)',letterSpacing:'.06em',lineHeight:1,textAlign:'center',
              ...(chaosMode
                ? { color:'#a5b4fc',animation:'headerBounce .4s ease-in-out 3',
                    textShadow:'0 0 30px rgba(129,140,248,.8),2px 2px 0 rgba(0,0,0,.9)' }
                : { color:'#c7d2fe',
                    textShadow:'0 0 30px rgba(129,140,248,.2),2px 2px 0 rgba(0,0,0,.95)' }),
            }}>CYBER-PONG</span>
          </button>

          <div style={{ width:'100%',maxWidth:'22rem',height:1,margin:'14px 0 10px',
            background:'linear-gradient(90deg,transparent,rgba(129,140,248,.3) 50%,transparent)' }}/>

          {/* JACK IN — lights up exactly when ball hits paddle */}
          <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
            <span style={{
              fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:600,
              letterSpacing:'.2em',textTransform:'uppercase',
              transition:'color .06s,text-shadow .06s',
              color:    hitting ? '#818cf8' : 'rgba(129,140,248,.1)',
              textShadow: hitting ? '0 0 10px rgba(129,140,248,.7)' : 'none',
            }}>⚡ JACK IN ⚡</span>
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
        <button onClick={handleCopy} style={{ background:'transparent',border:'none',padding:0,
          cursor:'pointer',display:'flex',alignItems:'center',gap:'6px' }}>
          <span style={{ fontSize:'.9rem' }}>🏓</span>
          <span style={{ fontFamily:'var(--font-display)',fontSize:'.62rem',fontWeight:700,
            letterSpacing:'.15em',color:'#818cf8',padding:'2px 5px',
            background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.2)' }}>BLIK</span>
          <span style={{ fontFamily:'var(--font-mono)',color:'#e0e0e0',fontSize:'.85rem',letterSpacing:'.06em' }}>
            {blikNumber}
          </span>
          {copied ? <Check size={12} style={{ color:'var(--cyber-green)' }}/> : <CopyIcon/>}
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
