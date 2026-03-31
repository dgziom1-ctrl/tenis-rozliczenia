import { useRef, useEffect } from 'react';

interface ArenaCanvasProps {
  chaosMode: boolean;
  onHit?: (hitting: boolean) => void;
}

export default function ArenaCanvas({ chaosMode, onHit }: ArenaCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);
  const t0  = useRef<number | null>(null);

  useEffect(() => {
    if (chaosMode) { cancelAnimationFrame(raf.current!); return; }
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d')!;
    const W = 560, H = 180, CX = 265, CY = 90;

    const dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const RX = 0.471, RY = -0.349;
    const cX = Math.cos(RX), sX = Math.sin(RX);
    const cY = Math.cos(RY), sY = Math.sin(RY);
    const FOV = 370, DIST = 290;

    const TX = 106, TZ = 36, NH = 19, TH = 5;
    const PR = 16,  PX = 122, PY = -21, CYCLE = 2400;

    const proj = (x: number, y: number, z: number): [number, number, number] => {
      const x1 = x*cY + z*sY,  z1 = -x*sY + z*cY;
      const y2 = y*cX - z1*sX, z2 =  y*sX + z1*cX;
      const s = FOV / (z2 + DIST);
      return [CX + x1*s, CY + y2*s, s];
    };

    const HIT_X = PX - 22;
    const HIT_Y = PY - 8;

    const KF: [number, number, number][] = [
      [-HIT_X, HIT_Y, 0.00],
      [  65,    0,    0.28],
      [ HIT_X, HIT_Y, 0.50],
      [ -65,    0,    0.78],
      [-HIT_X, HIT_Y, 1.00],
    ];
    const CP: [number, number][] = [
      [ 28, -70],
      [ 92, -10],
      [-28, -70],
      [-92, -10],
    ];

    const ballAt = (t: number): [number, number] => {
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

    const _quad = (pts: [number, number][], fill: string | CanvasGradient) => {
      g.beginPath();
      pts.forEach(([sx,sy], i) => i ? g.lineTo(sx, sy) : g.moveTo(sx, sy));
      g.closePath(); g.fillStyle = fill; g.fill();
    };
    const _seg = ([ax,ay]: [number, number],[bx,by]: [number, number], col: string, w: number) => {
      g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by);
      g.strokeStyle = col; g.lineWidth = w; g.stroke();
    };
    const ellipse = (cx: number, cy: number, rx: number, ry: number, rot?: number) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(rot || 0);
      g.scale(1, ry / Math.max(rx, 0.1));
      g.beginPath(); g.arc(0, 0, Math.max(rx, 0.1), 0, Math.PI*2);
      g.restore();
    };

    const HIT_T = 0.09;
    let lastHitState = false;
    let spinAngle = 0;

    let impactStartTs = -Infinity;
    const IMPACT_MS = 220;

    const staticCanvas = document.createElement('canvas');
    staticCanvas.width = canvas.width;
    staticCanvas.height = canvas.height;
    const sg = staticCanvas.getContext('2d');
    if (sg) {
      sg.setTransform(dpr, 0, 0, dpr, 0, 0);

      const quadS = (pts: [number, number][], fill: string | CanvasGradient) => {
        sg.beginPath();
        pts.forEach(([sx, sy], i) => (i ? sg.lineTo(sx, sy) : sg.moveTo(sx, sy)));
        sg.closePath();
        sg.fillStyle = fill;
        sg.fill();
      };
      const segS = ([ax, ay]: [number, number], [bx, by]: [number, number], col: string, w: number) => {
        sg.beginPath();
        sg.moveTo(ax, ay);
        sg.lineTo(bx, by);
        sg.strokeStyle = col;
        sg.lineWidth = w;
        sg.stroke();
      };

      sg.clearRect(0, 0, W, H);

      /* Table (static) */
      const FL = proj(-TX, 0, -TZ), FR = proj(TX, 0, -TZ);
      const BR = proj(TX, 0, TZ), BL = proj(-TX, 0, TZ);
      const tg = sg.createLinearGradient(BL[0], BL[1], FL[0], FL[1]);
      tg.addColorStop(0, '#020810'); tg.addColorStop(1, '#041828');
      quadS([FL, FR, BR, BL], tg);
      for (let i = 1; i < 4; i++) {
        const wz = -TZ + (i / 4) * TZ * 2;
        segS(proj(-TX, 0, wz), proj(TX, 0, wz), `rgba(0,180,255,${0.03 + i * 0.012})`, 0.8);
      }
      for (let i = 1; i < 5; i++) {
        const wx = -TX + (i / 5) * TX * 2;
        segS(proj(wx, 0, -TZ), proj(wx, 0, TZ), 'rgba(0,160,255,0.04)', 0.7);
      }
      segS(BL, FL, 'rgba(0,200,255,0.55)', 1.5);
      segS(BR, FR, 'rgba(0,200,255,0.55)', 1.5);
      segS(BL, BR, 'rgba(0,160,255,0.18)', 1.0);
      segS(proj(0, 0, -TZ), proj(0, 0, TZ), 'rgba(0,229,255,0.10)', 1);

      /* Table front face (static) */
      const FL2 = proj(-TX, TH, -TZ), FR2 = proj(TX, TH, -TZ);
      const fg = sg.createLinearGradient(0, FL[1], 0, FL2[1]);
      fg.addColorStop(0, 'rgba(0,140,220,0.35)'); fg.addColorStop(1, 'rgba(0,80,160,0.04)');
      quadS([FL, FR, FR2, FL2], fg);
      sg.save();
      sg.shadowBlur = 5;
      sg.shadowColor = 'rgba(0,229,255,0.50)';
      segS(FL, FR, 'rgba(0,229,255,0.80)', 1.8);
      sg.restore();

      /* Net (static) */
      const nBN = proj(0, 0, -TZ), nBF = proj(0, 0, TZ);
      const nTN = proj(0, -NH, -TZ), nTF = proj(0, -NH, TZ);
      const ng = sg.createLinearGradient(nTN[0], nTN[1], nBN[0], nBN[1]);
      ng.addColorStop(0, 'rgba(0,200,255,0.18)'); ng.addColorStop(1, 'rgba(0,100,200,0.03)');
      quadS([nBN, nBF, nTF, nTN], ng);
      for (let r = 0; r <= 4; r++) {
        const ny = -NH * (1 - r / 4);
        segS(proj(0, ny, -TZ), proj(0, ny, TZ), `rgba(0,200,255,${0.05 + r * 0.02})`, 0.85);
      }
      for (let c = 0; c <= 8; c++) {
        const wz = -TZ + (c / 8) * TZ * 2;
        segS(proj(0, 0, wz), proj(0, -NH, wz), 'rgba(0,180,255,0.07)', 0.8);
      }
      segS(nBN, nTN, 'rgba(0,229,255,0.75)', 2.2);
      segS(nBF, nTF, 'rgba(0,200,255,0.38)', 1.4);
      sg.save();
      sg.shadowBlur = 7;
      sg.shadowColor = 'rgba(0,229,255,0.95)';
      segS(nTN, nTF, 'rgba(200,248,255,0.95)', 2.5);
      sg.restore();
    }

    /* ── DRAW FRAME ── */
    const draw = (progress: number, nowTs: number) => {
      g.clearRect(0, 0, W, H);

      const leftHitT  = Math.min(progress, 1-progress) * 2;
      const rightHitT = Math.abs(progress - 0.5) * 2;
      const isHitting = leftHitT < HIT_T || rightHitT < HIT_T;
      if (isHitting !== lastHitState) {
        lastHitState = isHitting;
        if (isHitting) impactStartTs = nowTs;
        onHit?.(isHitting);
      }

      const impactRaw = impactStartTs > 0 ? Math.max(0, (IMPACT_MS - (nowTs - impactStartTs)) / IMPACT_MS) : 0;
      const impact = impactRaw * impactRaw * (3 - 2 * impactRaw);
      const shakeAmp = impact * 3;
      const shakeX = Math.sin(nowTs * 0.02) * shakeAmp;
      const shakeY = Math.cos(nowTs * 0.017) * shakeAmp * 0.6;

      g.save();
      if (impact > 0) g.translate(shakeX, shakeY);
      if (sg) g.drawImage(staticCanvas, 0, 0, W, H);

      /* Paddles before ball (ball always on top) */
      drawPaddle(-PX, progress, true, impact);
      drawPaddle( PX, progress, false, impact);

      /* Ball */
      const bv = ballAt(progress);
      const bq = proj(bv[0], bv[1], 0);
      const bR = 6.4 * bq[2];

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
      g.save();
      g.shadowBlur = 13 * bq[2] * (1 + impact * 0.6);
      g.shadowColor = `rgba(255,255,255,${Math.min(1, 0.86 + 0.18 * impact)})`;
      const bg = g.createRadialGradient(bq[0]-bR*.3,bq[1]-bR*.3,0, bq[0],bq[1],bR);
      bg.addColorStop(0,'#ffffff'); bg.addColorStop(.46,'#d8f5ff'); bg.addColorStop(1,'#80c8e0');
      g.beginPath(); g.arc(bq[0], bq[1], bR, 0, Math.PI*2);
      g.fillStyle = bg; g.fill();
      g.restore();

      /* ── TOPSPIN STRIPE ── */
      const stripeScreenY = bq[1] + Math.sin(spinAngle) * bR * 0.80;
      const stripeVis     = Math.abs(Math.cos(spinAngle));
      const stripeBoost   = stripeVis + impact * 0.9;
      if (stripeBoost > 0.06) {
        const srx = bR * stripeBoost * 0.92;
        const sry = Math.max(0.7, srx * 0.13);
        g.save();
        g.beginPath(); g.arc(bq[0], bq[1], bR * 0.96, 0, Math.PI*2); g.clip();
        g.save();
        g.translate(bq[0], stripeScreenY);
        g.scale(1, sry / srx);
        g.beginPath(); g.arc(0, 0, srx, 0, Math.PI*2);
        g.restore();
        g.strokeStyle = `rgba(0, 220, 255, ${0.12 + 0.35 * stripeVis + 0.30 * impact})`;
        g.lineWidth = 1.4;
        g.stroke();
        g.restore();
      }
      g.restore();
    };

    const drawPaddle = (px: number, progress: number, isLeft: boolean, impact: number) => {
      const hitT = isLeft ? Math.min(progress, 1-progress)*2 : Math.abs(progress-0.5)*2;
      const hitting = hitT < HIT_T;
      const impactK = 1 + impact * (hitting ? 1.0 : 0.25);

      const isApproaching = isLeft ? (progress > 0.5) : (progress < 0.5);
      const signedT = isApproaching ? -hitT : hitT;

      const APP_W = 0.34, FOL_W = 0.22, RET_W = 0.24;
      const inApp  = signedT >= -APP_W && signedT <  0;
      const inFol  = signedT >=  0     && signedT <= FOL_W;
      const inRet  = signedT >  FOL_W  && signedT <= FOL_W + RET_W;
      const inAnim = inApp || inFol || inRet;

      const tApp = inApp ? (signedT + APP_W) / APP_W : 0;
      const tFol = inFol ?  signedT / FOL_W           : 0;
      const tRet = inRet ? (signedT - FOL_W) / RET_W  : 0;

      const easeIn  = (t: number) => t * t * (3 - 2*t);
      const easeOut = (t: number) => 1 - (1-t) * (1-t);

      const netDir = isLeft ? 1 : -1;

      let yOff = 0;
      if      (inApp) yOff = easeIn(tApp) * (-8);
      else if (inFol) yOff = -8 + easeOut(tFol) * (-16);
      else if (inRet) yOff = -24 * (1 - easeIn(tRet));

      let xOff = 0;
      if      (inApp) xOff = tApp * tApp * 22;
      else if (inFol) xOff = 22 - tFol * 8;
      else if (inRet) xOff = 14 * (1 - easeIn(tRet));

      let tiltF = 0;
      if      (inApp) tiltF = easeIn(tApp);
      else if (inFol) tiltF = 1 - tFol * 0.4;
      else if (inRet) tiltF = 0.6 * (1 - tRet);
      const tiltZ = netDir * tiltF * 13;

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
      g.shadowBlur  = (hitting ? 20 : 8) * impactK;
      g.shadowColor = hitting
        ? `rgba(0,229,255,${0.90 + 0.15 * impact})`
        : `rgba(0,180,255,${0.40 + 0.08 * impact})`;
      g.strokeStyle = hitting
        ? `rgba(0,229,255,${0.70 + 0.15 * impact})`
        : `rgba(0,160,255,${0.36 + 0.08 * impact})`;
      g.lineWidth = 3.5;
      ellipse(cx, cy, rx*1.1, ry*1.1, ang); g.stroke();
      g.restore();

      /* Layer 2: dark body */
      const bdg = g.createRadialGradient(cx-rx*.16,cy-ry*.16,0, cx,cy,Math.max(rx,ry)*1.05);
      bdg.addColorStop(0,'#062038'); bdg.addColorStop(.76,'#031428'); bdg.addColorStop(1,'#010C1C');
      ellipse(cx, cy, rx, ry, ang); g.fillStyle = bdg; g.fill();

      /* Layer 3: rim stroke */
      g.strokeStyle = hitting
        ? `rgba(0,229,255,${0.90 + 0.12 * impact})`
        : `rgba(0,180,255,${0.55 + 0.06 * impact})`;
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

    const loop = (ts: number) => {
      if (!t0.current) t0.current = ts;
      draw(((ts - t0.current) % CYCLE) / CYCLE, ts);
      raf.current = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (!raf.current) return;
      cancelAnimationFrame(raf.current);
      raf.current = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopLoop();
      else startLoop();
    };

    document.addEventListener('visibilitychange', onVisibility);
    startLoop();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopLoop();
      t0.current = null;
    };
  }, [chaosMode, onHit]);

  return (
    <canvas ref={ref} width={560} height={180}
      style={{ display:'block', width:'100%', maxWidth:560, height:'auto' }} />
  );
}
