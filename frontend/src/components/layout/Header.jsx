import { Volume2, VolumeX, Smartphone, Check, Sun, Moon } from 'lucide-react';
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
    const W = 560, H = 180, CX = 265, CY = 90;

    const RX = 0.471, RY = -0.349;
    const cX = Math.cos(RX), sX = Math.sin(RX);
    const cY = Math.cos(RY), sY = Math.sin(RY);
    const FOV = 370, DIST = 290;

    const TX = 106, TZ = 36, NH = 19, TH = 5;
    const PR = 16,  PX = 122, PY = -21, CYCLE = 2400;

    const proj = (x, y, z) => {
      const x1 = x*cY + z*sY,  z1 = -x*sY + z*cY;
      const y2 = y*cX - z1*sX, z2 =  y*sX + z1*cX;
      const s = FOV / (z2 + DIST);
      return [CX + x1*s, CY + y2*s, s];
    };

    /* Contact point: x=PX-22=100, y=PY-8=-29 (matches paddle at peak topspin sweep) */
    const HIT_X = PX - 22;
    const HIT_Y = PY - 8;

    /* Topspin trajectory:
     * Long segments (paddle→bounce): CP biased toward landing side so ball dips on arrival.
     * Short segments (bounce→paddle): very flat CP — topspin keeps ball low & fast after bounce. */
    const KF = [
      [-HIT_X, HIT_Y, 0.00],
      [  65,    0,    0.28],
      [ HIT_X, HIT_Y, 0.50],
      [ -65,    0,    0.78],
      [-HIT_X, HIT_Y, 1.00],
    ];
    const CP = [
      [ 28, -70],   // left  paddle → right bounce : slight rightward bias
      [ 92, -10],   // right bounce → right paddle : FLAT (topspin = ball stays low)
      [-28, -70],   // right paddle → left  bounce
      [-92, -10],   // left  bounce → left  paddle : FLAT
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
    let spinAngle = 0;   // accumulated ball rotation (topspin)

    /* ── DRAW FRAME ── */
    const draw = (progress) => {
      g.clearRect(0, 0, W, H);

      const leftHitT  = Math.min(progress, 1-progress) * 2;
      const rightHitT = Math.abs(progress - 0.5) * 2;
      const isHitting = leftHitT < HIT_T || rightHitT < HIT_T;
      if (isHitting !== lastHitState) {
        lastHitState = isHitting;
        onHit?.(isHitting);
      }

      /* Table */
      const FL=proj(-TX,0,-TZ), FR=proj(TX,0,-TZ);
      const BR=proj(TX,0,TZ),   BL=proj(-TX,0,TZ);
      const tg = g.createLinearGradient(BL[0],BL[1],FL[0],FL[1]);
      tg.addColorStop(0,'#020810'); tg.addColorStop(1,'#041828');
      quad([FL,FR,BR,BL], tg);
      for (let i = 1; i < 4; i++) {
        const wz = -TZ + (i/4)*TZ*2;
        seg(proj(-TX,0,wz), proj(TX,0,wz), `rgba(0,180,255,${0.03+i*0.012})`, 0.8);
      }
      for (let i = 1; i < 5; i++) {
        const wx = -TX + (i/5)*TX*2;
        seg(proj(wx,0,-TZ), proj(wx,0,TZ), 'rgba(0,160,255,0.04)', 0.7);
      }
      seg(BL, FL, 'rgba(0,200,255,0.55)', 1.5);
      seg(BR, FR, 'rgba(0,200,255,0.55)', 1.5);
      seg(BL, BR, 'rgba(0,160,255,0.18)', 1.0);
      seg(proj(0,0,-TZ), proj(0,0,TZ), 'rgba(0,229,255,0.10)', 1);

      /* Table front face */
      const FL2=proj(-TX,TH,-TZ), FR2=proj(TX,TH,-TZ);
      const fg = g.createLinearGradient(0,FL[1],0,FL2[1]);
      fg.addColorStop(0,'rgba(0,140,220,0.35)'); fg.addColorStop(1,'rgba(0,80,160,0.04)');
      quad([FL,FR,FR2,FL2], fg);
      g.save(); g.shadowBlur=5; g.shadowColor='rgba(0,229,255,0.50)';
      seg(FL, FR, 'rgba(0,229,255,0.80)', 1.8);
      g.restore();

      /* Net */
      const nBN=proj(0,0,-TZ), nBF=proj(0,0,TZ);
      const nTN=proj(0,-NH,-TZ), nTF=proj(0,-NH,TZ);
      const ng = g.createLinearGradient(nTN[0],nTN[1],nBN[0],nBN[1]);
      ng.addColorStop(0,'rgba(0,200,255,0.18)'); ng.addColorStop(1,'rgba(0,100,200,0.03)');
      quad([nBN,nBF,nTF,nTN], ng);
      for (let r = 0; r <= 4; r++) {
        const ny = -NH*(1-r/4);
        seg(proj(0,ny,-TZ), proj(0,ny,TZ), `rgba(0,200,255,${0.05+r*0.02})`, 0.85);
      }
      for (let c = 0; c <= 8; c++) {
        const wz = -TZ + (c/8)*TZ*2;
        seg(proj(0,0,wz), proj(0,-NH,wz), 'rgba(0,180,255,0.07)', 0.8);
      }
      seg(nBN, nTN, 'rgba(0,229,255,0.75)', 2.2);
      seg(nBF, nTF, 'rgba(0,200,255,0.38)', 1.4);
      g.save(); g.shadowBlur=7; g.shadowColor='rgba(0,229,255,0.95)';
      seg(nTN, nTF, 'rgba(200,248,255,0.95)', 2.5);
      g.restore();

      /* Paddles before ball (ball always on top) */
      drawPaddle(-PX, progress, true);
      drawPaddle( PX, progress, false);

      /* Ball */
      const bv = ballAt(progress);
      const bq = proj(bv[0], bv[1], 0);
      const bR = 6.4 * bq[2];

      /* Accumulate spin angle: topspin rotates in same direction as travel */
      const prevBv = ballAt((progress - 0.007 + 1) % 1);
      spinAngle += (bv[0] - prevBv[0]) * 0.13;

      /* Ball shadow */
      const bs = proj(bv[0], 0, 0);
      const sa = Math.max(0, 0.20*(1 - Math.abs(bv[1])/68));
      g.save(); g.translate(bs[0], bs[1]); g.scale(1, 0.34);
      g.beginPath(); g.arc(0, 0, bR*1.55, 0, Math.PI*2);
      g.fillStyle = `rgba(0,50,120,${sa})`; g.fill();
      g.restore();

      /* Ghost trail */
      const tp = (progress-.02+1)%1, tv = ballAt(tp), tq = proj(tv[0],tv[1],0);
      g.beginPath(); g.arc(tq[0], tq[1], 3.6*tq[2], 0, Math.PI*2);
      g.fillStyle = 'rgba(0,200,255,0.06)'; g.fill();

      /* Ball sphere */
      g.save(); g.shadowBlur=13*bq[2]; g.shadowColor='rgba(255,255,255,0.86)';
      const bg = g.createRadialGradient(bq[0]-bR*.3,bq[1]-bR*.3,0, bq[0],bq[1],bR);
      bg.addColorStop(0,'#ffffff'); bg.addColorStop(.46,'#d8f5ff'); bg.addColorStop(1,'#80c8e0');
      g.beginPath(); g.arc(bq[0], bq[1], bR, 0, Math.PI*2);
      g.fillStyle = bg; g.fill();
      g.restore();

      /* ── TOPSPIN STRIPE ──
         A horizontal seam band that scrolls top→bottom as the ball rotates forward.
         spinAngle accumulates with travel distance → band sweeps continuously.   */
      const stripeScreenY = bq[1] + Math.sin(spinAngle) * bR * 0.80;
      const stripeVis     = Math.abs(Math.cos(spinAngle));
      if (stripeVis > 0.06) {
        const srx = bR * stripeVis * 0.92;
        const sry = Math.max(0.7, srx * 0.13);
        g.save();
        /* Clip to ball disc */
        g.beginPath(); g.arc(bq[0], bq[1], bR * 0.96, 0, Math.PI*2); g.clip();
        /* Draw the flattened ellipse (seam band) */
        g.save();
        g.translate(bq[0], stripeScreenY);
        g.scale(1, sry / srx);
        g.beginPath(); g.arc(0, 0, srx, 0, Math.PI*2);
        g.restore();
        g.strokeStyle = `rgba(0, 220, 255, ${0.12 + 0.35 * stripeVis})`;
        g.lineWidth = 1.4;
        g.stroke();
        g.restore();
      }
    };

    /* ── PADDLE (TOPSPIN SWING) ──
     *
     * The three phases of a topspin stroke:
     *
     *  APPROACH (signedT: -APP_W → 0)
     *    Paddle accelerates upward from rest toward the ball.
     *    X: lunges forward, accelerating toward net.
     *    Y: sweeps UP (from PY to HIT_Y = PY-8).
     *    Tilt: paddle face closes (top toward net) — this is what creates topspin.
     *
     *  FOLLOW-THROUGH (signedT: 0 → FOL_W)
     *    Paddle continues upward and forward past the ball.
     *    X: stays mostly forward, slight pullback.
     *    Y: continues sweeping UP (PY-8 → PY-24).
     *    Tilt: face stays closed, gradually opens.
     *
     *  RETURN (signedT: FOL_W → FOL_W+RET_W)
     *    Smoothly returns to idle rest position.
     */
    const drawPaddle = (px, progress, isLeft) => {
      const hitT = isLeft ? Math.min(progress, 1-progress)*2 : Math.abs(progress-0.5)*2;
      const hitting = hitT < HIT_T;

      /* Are we before or after impact? */
      const isApproaching = isLeft ? (progress > 0.5) : (progress < 0.5);
      const signedT = isApproaching ? -hitT : hitT;

      const APP_W = 0.34, FOL_W = 0.22, RET_W = 0.24;
      const inApp  = signedT >= -APP_W && signedT <  0;
      const inFol  = signedT >=  0     && signedT <= FOL_W;
      const inRet  = signedT >  FOL_W  && signedT <= FOL_W + RET_W;
      const inAnim = inApp || inFol || inRet;

      /* Phase-local 0→1 progress */
      const tApp = inApp ? (signedT + APP_W) / APP_W : 0;
      const tFol = inFol ?  signedT / FOL_W           : 0;
      const tRet = inRet ? (signedT - FOL_W) / RET_W  : 0;

      const easeIn  = t => t * t * (3 - 2*t);   // smoothstep
      const easeOut = t => 1 - (1-t) * (1-t);   // decelerate

      const netDir = isLeft ? 1 : -1;

      /* Y offset from PY (negative = higher = topspin upswing) */
      let yOff = 0;
      if      (inApp) yOff = easeIn(tApp) * (-8);            //   0 → -8
      else if (inFol) yOff = -8 + easeOut(tFol) * (-16);     //  -8 → -24
      else if (inRet) yOff = -24 * (1 - easeIn(tRet));       // -24 →   0

      /* X offset toward net */
      let xOff = 0;
      if      (inApp) xOff = tApp * tApp * 22;                //   0 → 22  (accelerate)
      else if (inFol) xOff = 22 - tFol * 8;                   //  22 → 14
      else if (inRet) xOff = 14 * (1 - easeIn(tRet));         //  14 →  0

      /* Tilt factor: 1 = fully closed face, 0 = neutral */
      let tiltF = 0;
      if      (inApp) tiltF = easeIn(tApp);
      else if (inFol) tiltF = 1 - tFol * 0.4;
      else if (inRet) tiltF = 0.6 * (1 - tRet);
      const tiltZ = netDir * tiltF * 13;

      /* Idle bob — muted entirely during animation */
      const bobPhase = isLeft ? 0 : Math.PI * 0.65;
      const bob = Math.sin(progress * Math.PI * 4 + bobPhase) * 2.0 * (inAnim ? 0 : 1);

      const swingX = px  + netDir * xOff;
      const finalY = PY  + yOff + bob;

      const bump = hitting ? 1 + (1 - hitT/HIT_T) * 0.12 : 1;
      const R    = PR * bump;

      const pc = proj(swingX, finalY, 0);
      const pr = proj(swingX+R, finalY,     0);
      const pl = proj(swingX-R, finalY,     0);
      const pt = proj(swingX,   finalY-R,   tiltZ);
      const pb = proj(swingX,   finalY+R,  -tiltZ * 0.25);

      const cx  = (pr[0]+pl[0]) / 2;
      const cy  = (pt[1]+pb[1]) / 2;
      const rx  = Math.hypot(pr[0]-pl[0], pr[1]-pl[1]) / 2;
      const ry  = Math.hypot(pt[0]-pb[0], pt[1]-pb[1]) / 2;
      const ang = Math.atan2(pt[1]-pb[1], pt[0]-pb[0]) + Math.PI/2;

      /* Layer 1: outer glow halo */
      g.save();
      g.shadowBlur  = hitting ? 20 : 8;
      g.shadowColor = hitting ? 'rgba(0,229,255,0.90)' : 'rgba(0,180,255,0.40)';
      g.strokeStyle = hitting ? 'rgba(0,229,255,0.70)' : 'rgba(0,160,255,0.36)';
      g.lineWidth = 3.5;
      ellipse(cx, cy, rx*1.1, ry*1.1, ang); g.stroke();
      g.restore();

      /* Layer 2: dark body */
      const bdg = g.createRadialGradient(cx-rx*.16,cy-ry*.16,0, cx,cy,Math.max(rx,ry)*1.05);
      bdg.addColorStop(0,'#062038'); bdg.addColorStop(.76,'#031428'); bdg.addColorStop(1,'#010C1C');
      ellipse(cx, cy, rx, ry, ang); g.fillStyle = bdg; g.fill();

      /* Layer 3: rim stroke */
      g.strokeStyle = hitting ? 'rgba(0,229,255,0.90)' : 'rgba(0,180,255,0.55)';
      g.lineWidth = 1.9;
      ellipse(cx, cy, rx*.95, ry*.95, ang); g.stroke();

      /* Layer 4: rubber face */
      const rfg = g.createRadialGradient(cx-rx*.1,cy-ry*.1,0, cx,cy,rx*.52);
      rfg.addColorStop(0, hitting ? 'rgba(0,229,255,0.95)' : 'rgba(0,180,220,0.85)');
      rfg.addColorStop(1, hitting ? 'rgba(0,160,210,0.88)' : 'rgba(0,120,180,0.72)');
      ellipse(cx, cy, rx*.52, ry*.52, ang); g.fillStyle = rfg; g.fill();

      /* Handle */
      const hs = proj(swingX, finalY + R/pc[2] + 1,  0);
      const he = proj(swingX, finalY + R/pc[2] + 14, 0);
      g.save(); g.lineCap = 'round';
      g.strokeStyle = 'rgba(2,12,28,0.95)'; g.lineWidth = 4.6*pc[2];
      g.beginPath(); g.moveTo(hs[0],hs[1]); g.lineTo(he[0],he[1]); g.stroke();
      g.strokeStyle = 'rgba(0,80,140,0.65)'; g.lineWidth = 2.1*pc[2];
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
    <canvas ref={ref} width={560} height={180}
      style={{ display:'block', width:'100%', maxWidth:560, height:'auto' }} />
  );
}

/* ═══════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════ */
export default function Header({ isMuted, setIsMuted, isConnected, scrolled, theme, onToggleTheme }) {
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

  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color:'var(--co-dim)' }}>
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
          justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
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
            <Arena chaosMode={chaosMode} onHit={handleHit}/>
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
            }}>CYBER-PONG</span>}
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
            }}>CYBER-PONG</span>
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
          <span style={{ fontSize:'.9rem' }}>🏓</span>
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
            color:isMuted?'var(--co-yellow)':'var(--co-dim)',
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
