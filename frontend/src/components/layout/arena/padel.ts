import type { SceneContext, ScreenPoint, Vec3 } from './types';
import { drawGlow, quad, rgba, seg } from './kit';
import { PADEL_MODEL, drawBall, type RacketSpec } from './gear';
import { createRallyScene, type RallySceneConfig } from './rallyScene';
import type { StrokeStyle } from './motion';

/*
 * Padel — kort zamknięty szkłem. Fizyka: piłka 57 g (prędkość graniczna
 * ok. 22 m/s), sprężystość kortu 0,76, szkła 0,62. Wymiana jak w meczu:
 * lewy gracz gra głęboko, piłka odbija się od kortu, wchodzi w tylną szybę
 * i dopiero po niej prawy gracz ją dobiera; odpowiedź wraca po jednym
 * odbiciu od kortu.
 */

const CL = 124;   // pół-długość kortu (x)
const CW = 50;    // pół-szerokość kortu (z)
const SLAB = 4;   // grubość płyty kortu
const NET_H = 12; // wysokość siatki
const GLASS_H = 30;
const MESH_H = 26;
const SERVICE_X = 86;


function paintCourt(sg: CanvasRenderingContext2D, { P, proj, lightMode }: SceneContext) {
  const p = (x: number, y: number, z: number) => proj(x, y, z);

  /* Płyta kortu */
  const FL = p(-CL, 0, -CW), FR = p(CL, 0, -CW), BR = p(CL, 0, CW), BL = p(-CL, 0, CW);
  const fg = sg.createLinearGradient(BL[0], BL[1], FL[0], FL[1]);
  fg.addColorStop(0, P.tableFrom); fg.addColorStop(1, P.tableTo);
  quad(sg, [FL, FR, BR, BL], fg);

  /* Delikatna faktura sztucznej trawy: gęste linie wzdłuż kortu. */
  for (let i = 1; i < 10; i++) {
    const z = -CW + (i / 10) * CW * 2;
    seg(sg, p(-CL, 0, z), p(CL, 0, z), rgba(P.grid, lightMode ? 0.05 : 0.028), 0.6);
  }

  /* Linie kortu */
  const line = rgba(P.edge, lightMode ? 0.42 : 0.38);
  seg(sg, p(-SERVICE_X, 0, -CW), p(-SERVICE_X, 0, CW), line, 1);
  seg(sg, p(SERVICE_X, 0, -CW), p(SERVICE_X, 0, CW), line, 1);
  seg(sg, p(-SERVICE_X, 0, 0), p(SERVICE_X, 0, 0), line, 0.9);
  seg(sg, BL, FL, rgba(P.edge, lightMode ? 0.45 : 0.55), 1.4);
  seg(sg, BR, FR, rgba(P.edge, lightMode ? 0.45 : 0.55), 1.4);
  seg(sg, BL, BR, rgba(P.grid, lightMode ? 0.24 : 0.2), 1);

  /* Przednia krawędź płyty — świecąca jak blat do ping-ponga. */
  const FL2 = p(-CL, SLAB, -CW), FR2 = p(CL, SLAB, -CW);
  const ff = sg.createLinearGradient(0, FL[1], 0, FL2[1]);
  ff.addColorStop(0, rgba(P.accentDeep, lightMode ? 0.18 : 0.35));
  ff.addColorStop(1, rgba(P.accentDeep, 0.04));
  quad(sg, [FL, FR, FR2, FL2], ff);
  sg.save();
  sg.shadowBlur = lightMode ? 3 : 5;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.35 : 0.5);
  seg(sg, FL, FR, rgba(P.accent, lightMode ? 0.65 : 0.8), 1.8);
  sg.restore();

  /* Szkło: tafla, pionowe łączenia, ukośny odblask i jasna górna krawędź. */
  const glassPanel = (a: Vec3, b: Vec3, h: number) => {
    const a0 = p(...a), b0 = p(...b);
    const a1 = p(a[0], a[1] - h, a[2]), b1 = p(b[0], b[1] - h, b[2]);
    const gg = sg.createLinearGradient(0, Math.min(a1[1], b1[1]), 0, Math.max(a0[1], b0[1]));
    gg.addColorStop(0, rgba(P.edge, lightMode ? 0.12 : 0.13));
    gg.addColorStop(1, rgba(P.deepShade, lightMode ? 0.03 : 0.02));
    quad(sg, [a0, b0, b1, a1], gg);
    /* Odblask: wąski ukośny pas przez taflę. */
    const mid = (k: number, top: boolean): ScreenPoint => {
      const x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k;
      return p(x, top ? -h : 0, z);
    };
    sg.save();
    sg.beginPath();
    sg.moveTo(a0[0], a0[1]); sg.lineTo(b0[0], b0[1]); sg.lineTo(b1[0], b1[1]); sg.lineTo(a1[0], a1[1]);
    sg.closePath();
    sg.clip();
    quad(sg, [mid(0.18, false), mid(0.3, false), mid(0.52, true), mid(0.4, true)], rgba(P.white, lightMode ? 0.18 : 0.045));
    quad(sg, [mid(0.34, false), mid(0.37, false), mid(0.59, true), mid(0.56, true)], rgba(P.white, lightMode ? 0.14 : 0.035));
    sg.restore();
    seg(sg, a1, b1, rgba(P.accent, lightMode ? 0.5 : 0.55), 1.2);
    seg(sg, a0, a1, rgba(P.edge, lightMode ? 0.3 : 0.32), 0.9);
    seg(sg, b0, b1, rgba(P.edge, lightMode ? 0.3 : 0.32), 0.9);
  };

  /* Siatka ogrodzenia między szybami: drobna krata po przekątnych. */
  const meshPanel = (x0: number, x1: number) => {
    const z = CW;
    const a0 = p(x0, 0, z), b0 = p(x1, 0, z), a1 = p(x0, -MESH_H, z), b1 = p(x1, -MESH_H, z);
    quad(sg, [a0, b0, b1, a1], rgba(P.deepShade, lightMode ? 0.03 : 0.05));
    sg.save();
    sg.beginPath();
    sg.moveTo(a0[0], a0[1]); sg.lineTo(b0[0], b0[1]); sg.lineTo(b1[0], b1[1]); sg.lineTo(a1[0], a1[1]);
    sg.closePath();
    sg.clip();
    sg.beginPath();
    const step = 7;
    for (let x = x0 - MESH_H; x <= x1 + MESH_H; x += step) {
      const s0 = p(x, 0, z), s1 = p(x + MESH_H, -MESH_H, z), s2 = p(x - MESH_H, -MESH_H, z);
      sg.moveTo(s0[0], s0[1]); sg.lineTo(s1[0], s1[1]);
      sg.moveTo(s0[0], s0[1]); sg.lineTo(s2[0], s2[1]);
    }
    sg.strokeStyle = rgba(P.grid, lightMode ? 0.12 : 0.09);
    sg.lineWidth = 0.5;
    sg.stroke();
    sg.restore();
    seg(sg, a1, b1, rgba(P.edge, lightMode ? 0.32 : 0.3), 1);
    /* Słupki ogrodzenia */
    for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 4) {
      seg(sg, p(x, 0, z), p(x, -MESH_H, z), rgba(P.edge, lightMode ? 0.22 : 0.2), 0.8);
    }
  };

  const SIDE_GLASS = 34;
  glassPanel([-CL, 0, CW], [-CL + SIDE_GLASS, 0, CW], GLASS_H);
  meshPanel(-CL + SIDE_GLASS, CL - SIDE_GLASS);
  glassPanel([CL - SIDE_GLASS, 0, CW], [CL, 0, CW], GLASS_H);
  /* Tylna szyba po prawej — na nią leci piłka. */
  glassPanel([CL, 0, CW], [CL, 0, 0], GLASS_H);
  glassPanel([CL, 0, 0], [CL, 0, -CW], GLASS_H);

  /* Siatka do gry */
  const nZ = CW + 3;
  const nBN = p(0, 0, -nZ), nBF = p(0, 0, nZ);
  const nTN = p(0, -NET_H, -nZ), nTF = p(0, -NET_H, nZ);
  const ng = sg.createLinearGradient(nTN[0], nTN[1], nBN[0], nBN[1]);
  ng.addColorStop(0, rgba(P.edge, lightMode ? 0.14 : 0.18));
  ng.addColorStop(1, rgba(P.deepShade, 0.03));
  quad(sg, [nBN, nBF, nTF, nTN], ng);
  for (let r = 1; r <= 3; r++) {
    const y = -NET_H * (r / 4);
    seg(sg, p(0, y, -nZ), p(0, y, nZ), rgba(P.edge, lightMode ? 0.1 : 0.08), 0.7);
  }
  for (let c = 1; c < 14; c++) {
    const z = -nZ + (c / 14) * nZ * 2;
    seg(sg, p(0, 0, z), p(0, -NET_H, z), rgba(P.grid, lightMode ? 0.1 : 0.07), 0.7);
  }
  seg(sg, nBN, nTN, rgba(P.edge, lightMode ? 0.6 : 0.8), 2.2);
  seg(sg, nBF, nTF, rgba(P.edge, lightMode ? 0.32 : 0.4), 1.4);
  sg.save();
  sg.shadowBlur = lightMode ? 4 : 7;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.45 : 0.95);
  seg(sg, nTN, nTF, lightMode ? rgba(P.accent, 0.75) : rgba(P.netTop, 0.95), 2.4);
  sg.restore();
}

/** Metry → jednostki: kort 20 × 10 m rysowany jako 248 × 100. */
const U = CL / 10;
const ZU = CW / 5;
const BALL_R = 3.6;
/** Fizyczna ściana stoi o promień piłki przed szybą — inaczej piłka wchodziłaby w szkło. */
const GLASS_AT = 10 - BALL_R / U;

const RACKET: RacketSpec = {
  model: PADEL_MODEL,
  headLen: 7.4,
  headWid: 6.2,
  shaft: 2.4,
  handle: 7,
  shaftWidth: 2.5,
  solid: true,
};

/**
 * Zwarte uderzenie z ciała: krótki zamach z obrotem barków, kontakt przed
 * sobą, wymach w stronę siatki. Jednostki: 1 ≈ 8 cm.
 */
const DRIVE: StrokeStyle = {
  keys: [
    { t: -0.5, hand: [-2, 1, 1], yaw: 0, pitch: -10, roll: 0 },
    { t: -0.18, hand: [-7, 1.5, 3], yaw: 55, pitch: 22, roll: -10 },
    { t: 0, hand: [0, 0, 0], yaw: 0, pitch: 0, roll: 0 },
    { t: 0.14, hand: [6, 2.5, -3], yaw: -50, pitch: -28, roll: 12 },
    { t: 0.45, hand: [-2, 1, 1], yaw: 0, pitch: -10, roll: 0 },
  ],
  axisHint: [0, -1, 0],
  faceBias: 0.55,
  idle: 0.5,
};

export const PADEL_RALLY: RallySceneConfig = {
  physics: {
    g: 9.81, vt: 22, magnus: 0.25, floorE: 0.76, floorFriction: 0.86,
    walls: [
      { axis: 0, at: GLASS_AT, side: 1, e: 0.62, friction: 0.88, kind: 'glass' },
      { axis: 0, at: -GLASS_AT, side: -1, e: 0.62, friction: 0.88, kind: 'glass' },
    ],
  },
  shots: [
    { from: [-8.2, 1.0, 0.5], T: 1.75, expect: ['floor'], guess: [16.9, 6.5, -1.7], via: { at: [GLASS_AT, 1.05, -1.3], t: 1.32, wall: 'glass' } },
    { T: 1.4, expect: ['floor'], guess: [-13.11, 7.13, 1.85] },
  ],
  map: { sx: U, sy: U, sz: ZU, ox: 0, oy: 0, oz: 0 },
  ballR: BALL_R,
  slowmo: 1,
  players: [
    { shots: [0], racket: RACKET, style: DRIVE },
    { shots: [1], racket: RACKET, style: DRIVE },
  ],
  staticProgress: 0.18,
  paintStatic: paintCourt,
  flashes: { floor: { size: 7, dur: 0.09 }, glass: { size: 13, dur: 0.16 } },
  trail: { count: 3, spacing: 0.014 },
  drawUnder(g, ctx, ball) {
    /* Odbicie piłki w tylnej szybie — lustro względem płaszczyzny szkła. */
    const toGlass = CL - ball.pos[0];
    if (toGlass > 34 || toGlass < 0) return;
    const glassPoly = p4(ctx.proj, [CL, 0, CW], [CL, 0, -CW], GLASS_H);
    g.save();
    g.beginPath();
    glassPoly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.clip();
    const k = 1 - toGlass / 34;
    const mq = ctx.proj(CL + toGlass, ball.pos[1], ball.pos[2]);
    const mr = BALL_R * mq[2];
    drawGlow(g, ctx.glows.ball, mq[0], mq[1], mr * 2.2, 0.3 * k);
    g.beginPath(); g.arc(mq[0], mq[1], mr, 0, Math.PI * 2);
    g.fillStyle = rgba(ctx.P.white, 0.18 * k);
    g.fill();
    g.restore();
  },
  drawBall(g, ctx, ball, impact) {
    drawBall(g, ctx, ball.pos, { radius: BALL_R, impact, spin: ball.t * Math.PI * 2 * 1.6 });
  },
};

export const createPadelScene = createRallyScene(PADEL_RALLY);

/** Czworokąt pionowej tafli od `a` do `b` o wysokości `h`, już po rzucie. */
function p4(
  proj: (x: number, y: number, z: number) => [number, number, number],
  a: Vec3, b: Vec3, h: number,
): ScreenPoint[] {
  return [proj(...a), proj(...b), proj(b[0], b[1] - h, b[2]), proj(a[0], a[1] - h, a[2])];
}
