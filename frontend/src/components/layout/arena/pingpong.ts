import type { SceneContext } from './types';
import { quad, rgba, seg } from './kit';
import { PINGPONG_MODEL, drawBall, type RacketSpec } from './gear';
import { createRallyScene, type RallySceneConfig } from './rallyScene';
import type { StrokeStyle } from './motion';

/*
 * Ping-pong. Stół i siatka bez zmian względem pierwotnej areny; ruch piłki
 * wynika z fizyki: grawitacja, opór powietrza (piłeczka 2,7 g ma prędkość
 * graniczną ok. 8,4 m/s, więc wyraźnie hamuje), topspin (Magnus ściąga lot
 * w dół po przejściu nad siatką) i sprężystość stołu 0,86.
 *
 * Wymiana jest pokazana w zwolnieniu 0,5, jak powtórka: prawdziwy ping-pong
 * (uderzenie co ~0,5 s) w nagłówku męczył wzrok. Zwalniamy jednakowo piłkę
 * i rakietki, więc proporcje ruchu zostają prawdziwe, a tempo wraca do
 * ok. 1 s na uderzenie — jak w pierwotnej arenie.
 */

const TX = 106, TZ = 36, NH = 19, TH = 5;

/** Metry → jednostki: stół 2,74 × 1,525 m rysowany jako 212 × 72. */
const U = TX / 1.37;

function paintTable(sg: CanvasRenderingContext2D, { P, proj, lightMode }: SceneContext) {
  /* Blat */
  const FL = proj(-TX, 0, -TZ), FR = proj(TX, 0, -TZ);
  const BR = proj(TX, 0, TZ), BL = proj(-TX, 0, TZ);
  const tg = sg.createLinearGradient(BL[0], BL[1], FL[0], FL[1]);
  tg.addColorStop(0, P.tableFrom); tg.addColorStop(1, P.tableTo);
  quad(sg, [FL, FR, BR, BL], tg);
  const gridA = lightMode ? 0.06 : 0.03;
  const gridB = lightMode ? 0.10 : 0.04;
  const gridRgb = P.grid;
  for (let i = 1; i < 4; i++) {
    const wz = -TZ + (i / 4) * TZ * 2;
    seg(sg, proj(-TX, 0, wz), proj(TX, 0, wz), `rgba(${gridRgb},${gridA + i * 0.012})`, 0.8);
  }
  for (let i = 1; i < 5; i++) {
    const wx = -TX + (i / 5) * TX * 2;
    seg(sg, proj(wx, 0, -TZ), proj(wx, 0, TZ), `rgba(${gridRgb},${gridB})`, 0.7);
  }
  const edgeRgb = P.edge;
  seg(sg, BL, FL, `rgba(${edgeRgb},${lightMode ? 0.45 : 0.55})`, 1.5);
  seg(sg, BR, FR, `rgba(${edgeRgb},${lightMode ? 0.45 : 0.55})`, 1.5);
  seg(sg, BL, BR, `rgba(${gridRgb},${lightMode ? 0.22 : 0.18})`, 1.0);
  seg(sg, proj(0, 0, -TZ), proj(0, 0, TZ), `rgba(${edgeRgb},${lightMode ? 0.14 : 0.10})`, 1);

  /* Przednia krawędź blatu */
  const FL2 = proj(-TX, TH, -TZ), FR2 = proj(TX, TH, -TZ);
  const fg = sg.createLinearGradient(0, FL[1], 0, FL2[1]);
  fg.addColorStop(0, rgba(P.accentDeep, lightMode ? 0.18 : 0.35));
  fg.addColorStop(1, rgba(P.accentDeep, 0.04));
  quad(sg, [FL, FR, FR2, FL2], fg);
  sg.save();
  sg.shadowBlur = lightMode ? 3 : 5;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.35 : 0.50);
  seg(sg, FL, FR, rgba(P.accent, lightMode ? 0.65 : 0.80), 1.8);
  sg.restore();

  /* Siatka */
  const nBN = proj(0, 0, -TZ), nBF = proj(0, 0, TZ);
  const nTN = proj(0, -NH, -TZ), nTF = proj(0, -NH, TZ);
  const ng = sg.createLinearGradient(nTN[0], nTN[1], nBN[0], nBN[1]);
  ng.addColorStop(0, rgba(P.edge, lightMode ? 0.14 : 0.18));
  ng.addColorStop(1, rgba(P.deepShade, 0.03));
  quad(sg, [nBN, nBF, nTF, nTN], ng);
  for (let r = 0; r <= 4; r++) {
    const ny = -NH * (1 - r / 4);
    seg(sg, proj(0, ny, -TZ), proj(0, ny, TZ), `rgba(${edgeRgb},${lightMode ? 0.08 + r * 0.02 : 0.05 + r * 0.02})`, 0.85);
  }
  for (let c = 0; c <= 8; c++) {
    const wz = -TZ + (c / 8) * TZ * 2;
    seg(sg, proj(0, 0, wz), proj(0, -NH, wz), `rgba(${gridRgb},${lightMode ? 0.10 : 0.07})`, 0.8);
  }
  seg(sg, nBN, nTN, `rgba(${edgeRgb},${lightMode ? 0.55 : 0.75})`, 2.2);
  seg(sg, nBF, nTF, `rgba(${edgeRgb},${lightMode ? 0.30 : 0.38})`, 1.4);
  sg.save();
  sg.shadowBlur = lightMode ? 4 : 7;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.45 : 0.95);
  seg(sg, nTN, nTF, lightMode ? rgba(P.accent, 0.75) : rgba(P.netTop, 0.95), 2.5);
  sg.restore();
}

const RACKET: RacketSpec = {
  model: PINGPONG_MODEL,
  // Proporcje prawdziwej rakietki: blat ~158 × 150 mm, uchwyt ~100 mm i szeroki.
  headLen: 12.4,
  headWid: 11.8,
  shaft: 1.2,
  handle: 10.5,
  shaftWidth: 4.2,
  solid: true,
  faceInset: 0.95,
  rim: 0.55,
};

/**
 * Forhend topspinowy: rakietka schodzi nisko i do tyłu, potem szczotkuje
 * piłkę w górę i do przodu, kończąc wysoko po przekątnej. Jednostki: 7,7 ≈ 10 cm.
 */
const FOREHAND: StrokeStyle = {
  keys: [
    { t: -0.42, hand: [-6, 2, 1], yaw: 0, pitch: 6, roll: 0 },
    { t: -0.13, hand: [-17, -8, 3], yaw: 12, pitch: 14, roll: -4 },
    { t: 0, hand: [0, 0, 0], yaw: 0, pitch: 0, roll: 0 },
    { t: 0.12, hand: [13, 13, -4], yaw: -12, pitch: -14, roll: 5 },
    { t: 0.42, hand: [-6, 2, 1], yaw: 0, pitch: 6, roll: 0 },
  ],
  axisHint: [0, -1, 0],
  faceBias: 0.75,
  idle: 0.8,
};

export const PINGPONG_RALLY: RallySceneConfig = {
  physics: { g: 9.81, vt: 8.4, magnus: 1.4, floorE: 0.86, floorFriction: 0.93, walls: [] },
  shots: [
    { from: [-1.58, 0.3, 0.08], T: 0.52, expect: ['floor'], guess: [7.83, 2.97, -0.5] },
    { from: [1.56, 0.3, -0.12], T: 0.52, expect: ['floor'], guess: [-7.83, 2.97, 0.5] },
  ],
  map: { sx: U, sy: U, sz: TZ / 0.7625, ox: 0, oy: 0, oz: 0 },
  ballR: 5,
  slowmo: 0.5,
  players: [
    { shots: [0], racket: RACKET, style: FOREHAND },
    { shots: [1], racket: RACKET, style: FOREHAND },
  ],
  staticProgress: 0.3,
  paintStatic: paintTable,
  flashes: { floor: { size: 9, dur: 0.07 } },
  trail: { count: 3, spacing: 0.012 },
  drawBall(g, ctx, ball, impact) {
    drawBall(g, ctx, ball.pos, { radius: 5, impact, spin: ball.t * Math.PI * 2 * 2.4 });
  },
};

export const createPingPongScene = createRallyScene(PINGPONG_RALLY);
