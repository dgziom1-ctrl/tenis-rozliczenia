import type { SceneContext, Vec3 } from './types';
import { clamp01, quad, rgba, seg } from './kit';
import { BADMINTON_MODEL, type RacketSpec } from './gear';
import { createRallyScene, type BallState, type RallySceneConfig } from './rallyScene';
import type { StrokeStyle } from './motion';

/*
 * Badminton — wysoka siatka zawieszona nad podłogą i lotka zamiast piłki.
 * Fizyka lotki: prędkość graniczna ok. 6,8 m/s, więc po uderzeniu (ok. 25 m/s)
 * gwałtownie hamuje i spada niemal pionowo. Lotka zawsze leci korkiem do
 * przodu; po uderzeniu przekręca się w ok. 50 ms, jak w rzeczywistości.
 */

const FY = 16;           // poziom podłogi — niżej niż w innych scenach, żeby łuk zmieścił się w kadrze
const CL = 116;          // pół-długość boiska
const Z_NEAR = -34, Z_FAR = 40;
const Z_MID = (Z_NEAR + Z_FAR) / 2;
const SLAB = 4;
const NET_TOP = FY - 30; // górna taśma siatki
const NET_BOTTOM = FY - 15; // siatka wisi — pod nią jest prześwit
const SHORT_SERVICE = 17;
const LONG_SERVICE = CL - 7;
const SINGLES_INSET = 5.5;

/* Lotka */
const CORK_R = 2.1;
const SKIRT_LEN = 7.4;
const SKIRT_R0 = 1.55;
const SKIRT_R1 = 3.8;
const FEATHERS = 14;

function drawShuttle(g: CanvasRenderingContext2D, ctx: SceneContext, pos: Vec3, angle: number, impact: number) {
  const { P, proj, glows, lightMode } = ctx;
  const o: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
  const n: Vec3 = [-Math.sin(angle), Math.cos(angle), 0];
  const zAx: Vec3 = [0, 0, 1];
  const ring = (dist: number, r: number) => Array.from({ length: FEATHERS }, (_, i) => {
    const th = (i / FEATHERS) * Math.PI * 2;
    const c = Math.cos(th) * r, s = Math.sin(th) * r;
    return proj(
      pos[0] - o[0] * dist + n[0] * c + zAx[0] * s,
      pos[1] - o[1] * dist + n[1] * c + zAx[1] * s,
      pos[2] - o[2] * dist + n[2] * c + zAx[2] * s,
    );
  });
  const base = ring(CORK_R * 0.55, SKIRT_R0);
  const mid = ring(SKIRT_LEN * 0.42, SKIRT_R0 + (SKIRT_R1 - SKIRT_R0) * 0.42);
  const end = ring(SKIRT_LEN, SKIRT_R1);

  /* Poświata — mniejsza niż przy piłce, lotka jest lżejsza w odbiorze. */
  const c = proj(pos[0], pos[1], pos[2]);
  if (glows.ball) {
    const gr = CORK_R * c[2] * (4.2 + impact * 2);
    g.save();
    g.globalAlpha = Math.min(1, 0.5 + 0.4 * impact);
    g.drawImage(glows.ball, c[0] - gr, c[1] - gr, gr * 2, gr * 2);
    g.restore();
  }

  /* Spódniczka: półprzezroczyste pola między piórami. */
  g.beginPath();
  for (let i = 0; i < FEATHERS; i++) {
    const j = (i + 1) % FEATHERS;
    g.moveTo(base[i][0], base[i][1]);
    g.lineTo(end[i][0], end[i][1]);
    g.lineTo(end[j][0], end[j][1]);
    g.lineTo(base[j][0], base[j][1]);
    g.closePath();
  }
  g.fillStyle = rgba(P.white, lightMode ? 0.22 : 0.07);
  g.fill();

  /* Stosiny piór */
  g.beginPath();
  for (let i = 0; i < FEATHERS; i++) {
    g.moveTo(base[i][0], base[i][1]);
    g.lineTo(end[i][0], end[i][1]);
  }
  g.strokeStyle = rgba(lightMode ? P.accent : P.netTop, lightMode ? 0.55 : 0.5);
  g.lineWidth = 0.55;
  g.stroke();

  /* Nić wiążąca i krawędź spódniczki */
  const loop = (pts: [number, number, number][]) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  loop(mid);
  g.strokeStyle = rgba(P.accent, 0.55);
  g.lineWidth = 0.6;
  g.stroke();
  loop(end);
  g.strokeStyle = rgba(lightMode ? P.accent : P.netTop, 0.85);
  g.lineWidth = 1.1;
  g.stroke();

  /* Korek */
  const r = CORK_R * c[2];
  const cg = g.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.35, 0, c[0], c[1], r);
  cg.addColorStop(0, P.ballCore);
  cg.addColorStop(0.55, P.ballMid);
  cg.addColorStop(1, rgba(P.accent, 0.95));
  g.beginPath(); g.arc(c[0], c[1], r, 0, Math.PI * 2);
  g.fillStyle = cg; g.fill();
}

function paintCourt(sg: CanvasRenderingContext2D, { P, proj, lightMode }: SceneContext) {
  const p = (x: number, y: number, z: number) => proj(x, y, z);

  /* Parkiet */
  const FL = p(-CL, FY, Z_NEAR), FR = p(CL, FY, Z_NEAR), BR = p(CL, FY, Z_FAR), BL = p(-CL, FY, Z_FAR);
  const fg = sg.createLinearGradient(BL[0], BL[1], FL[0], FL[1]);
  fg.addColorStop(0, P.tableFrom); fg.addColorStop(1, P.tableTo);
  quad(sg, [FL, FR, BR, BL], fg);
  for (let i = 1; i < 14; i++) {
    const z = Z_NEAR + (i / 14) * (Z_FAR - Z_NEAR);
    seg(sg, p(-CL, FY, z), p(CL, FY, z), rgba(P.grid, lightMode ? 0.045 : 0.025), 0.55);
  }

  /* Linie boiska: debel, singiel, linie serwisu, środkowa. */
  const strong = rgba(P.edge, lightMode ? 0.5 : 0.46);
  const soft = rgba(P.edge, lightMode ? 0.36 : 0.3);
  seg(sg, p(-CL, FY, Z_NEAR + SINGLES_INSET), p(CL, FY, Z_NEAR + SINGLES_INSET), soft, 0.8);
  seg(sg, p(-CL, FY, Z_FAR - SINGLES_INSET), p(CL, FY, Z_FAR - SINGLES_INSET), soft, 0.8);
  for (const x of [-SHORT_SERVICE, SHORT_SERVICE, -LONG_SERVICE, LONG_SERVICE]) {
    seg(sg, p(x, FY, Z_NEAR), p(x, FY, Z_FAR), soft, 0.8);
  }
  seg(sg, p(-CL, FY, Z_MID), p(-SHORT_SERVICE, FY, Z_MID), soft, 0.8);
  seg(sg, p(SHORT_SERVICE, FY, Z_MID), p(CL, FY, Z_MID), soft, 0.8);
  seg(sg, BL, FL, strong, 1.4);
  seg(sg, BR, FR, strong, 1.4);
  seg(sg, BL, BR, rgba(P.grid, lightMode ? 0.24 : 0.2), 1);

  /* Przednia krawędź płyty */
  const FL2 = p(-CL, FY + SLAB, Z_NEAR), FR2 = p(CL, FY + SLAB, Z_NEAR);
  const ff = sg.createLinearGradient(0, FL[1], 0, FL2[1]);
  ff.addColorStop(0, rgba(P.accentDeep, lightMode ? 0.18 : 0.35));
  ff.addColorStop(1, rgba(P.accentDeep, 0.04));
  quad(sg, [FL, FR, FR2, FL2], ff);
  sg.save();
  sg.shadowBlur = lightMode ? 3 : 5;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.35 : 0.5);
  seg(sg, FL, FR, rgba(P.accent, lightMode ? 0.65 : 0.8), 1.8);
  sg.restore();

  /* Słupki i siatka zawieszona nad podłogą */
  const zN = Z_NEAR - 3, zF = Z_FAR + 3;
  const tN = p(0, NET_TOP, zN), tF = p(0, NET_TOP, zF);
  const bN = p(0, NET_BOTTOM, zN), bF = p(0, NET_BOTTOM, zF);
  const ng = sg.createLinearGradient(tN[0], tN[1], bN[0], bN[1]);
  ng.addColorStop(0, rgba(P.edge, lightMode ? 0.14 : 0.16));
  ng.addColorStop(1, rgba(P.deepShade, 0.04));
  quad(sg, [tN, tF, bF, bN], ng);
  sg.beginPath();
  for (let c = 1; c < 22; c++) {
    const z = zN + (c / 22) * (zF - zN);
    const a = p(0, NET_TOP, z), b = p(0, NET_BOTTOM, z);
    sg.moveTo(a[0], a[1]); sg.lineTo(b[0], b[1]);
  }
  for (let r = 1; r < 5; r++) {
    const y = NET_TOP + (r / 5) * (NET_BOTTOM - NET_TOP);
    const a = p(0, y, zN), b = p(0, y, zF);
    sg.moveTo(a[0], a[1]); sg.lineTo(b[0], b[1]);
  }
  sg.strokeStyle = rgba(P.grid, lightMode ? 0.12 : 0.09);
  sg.lineWidth = 0.55;
  sg.stroke();
  seg(sg, bN, bF, rgba(P.edge, lightMode ? 0.3 : 0.32), 1);
  /* Słupki: bliższy mocniej, dalszy słabiej — jak w ping-pongu. */
  seg(sg, p(0, FY, zN), p(0, NET_TOP - 1, zN), rgba(P.edge, lightMode ? 0.6 : 0.8), 2.2);
  seg(sg, p(0, FY, zF), p(0, NET_TOP - 1, zF), rgba(P.edge, lightMode ? 0.32 : 0.4), 1.4);
  sg.save();
  sg.shadowBlur = lightMode ? 4 : 7;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.45 : 0.95);
  seg(sg, tN, tF, lightMode ? rgba(P.accent, 0.75) : rgba(P.netTop, 0.95), 2.2);
  sg.restore();
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Orientacja lotki z fizyki: korek prowadzi w kierunku lotu. W chwili
 * uderzenia lotka jest jeszcze zwrócona korkiem w stronę rakiety (tak
 * nadleciała) i przekręca się do nowego kierunku w ok. 50 ms, z lekkim,
 * szybko gasnącym rozkołysaniem piór.
 */
function shuttleAngle(ball: BallState): number {
  const now = Math.atan2(ball.vel[1], ball.vel[0]);
  const before = Math.atan2(ball.vBeforeHit[1], ball.vBeforeHit[0]);
  const k = clamp01(ball.sinceHit / 0.05);
  const turn = k * k * (3 - 2 * k);
  const settle = ball.sinceHit - 0.05;
  const wobble = settle > 0 ? 0.07 * Math.exp(-settle / 0.08) * Math.sin(settle * 70) : 0;
  return now + wrapAngle(before - now) * (1 - turn) + wobble;
}

/** Metry → jednostki: boisko 13,4 × 6,1 m; pion lekko ściśnięty, żeby wysoki lot zmieścił się w kadrze. */
const UX = CL / 6.7;
const UY = 15;
const UZ = (Z_FAR - Z_NEAR) / 6.1;

const RACKET: RacketSpec = {
  model: BADMINTON_MODEL,
  headLen: 6.6,
  headWid: 5.3,
  shaft: 8.6,
  handle: 6,
  shaftWidth: 1.3,
  solid: false,
};

/**
 * Clear znad głowy: rakieta odchyla się za głowę (nie opada do pleców —
 * przy powiększonej rakiecie głowa schodziła prawie do podłogi), łokieć
 * prowadzi, ramię prostuje się i rakieta smaga przez kontakt wysoko przed głową.
 * Wymach jest krótki: przy clearze rakieta po kontakcie schodzi tylko lekko
 * przed siebie, a nie aż do pasa jak przy smeczu. Jednostki: 1 ≈ 6 cm.
 */
const OVERHEAD: StrokeStyle = {
  keys: [
    { t: -0.6, hand: [-3, -4, 2], yaw: 0, pitch: -15, roll: 0 },
    { t: -0.22, hand: [-2.5, -0.5, 2], yaw: 10, pitch: 38, roll: 0 },
    { t: -0.08, hand: [-1.2, -0.3, 1], yaw: 5, pitch: 16, roll: 0 },
    { t: 0, hand: [0, 0, 0], yaw: 0, pitch: 0, roll: 0 },
    { t: 0.1, hand: [3, -1, -1.5], yaw: -10, pitch: -36, roll: 6 },
    { t: 0.3, hand: [1, -2.5, -1], yaw: -5, pitch: -26, roll: 2 },
    { t: 0.75, hand: [-3, -4, 2], yaw: 0, pitch: -15, roll: 0 },
  ],
  axisHint: [0, -1, 0],
  // Twarz patrzy w stronę siatki (kierunek lotu lotki), lekko ku widzowi.
  faceForward: true,
  faceBias: 0.45,
  idle: 0.5,
};

export const BADMINTON_RALLY: RallySceneConfig = {
  physics: { g: 9.81, vt: 6.8, magnus: 0, floorE: 0.1, floorFriction: 0.5, walls: [] },
  shots: [
    { from: [-5.4, 2.55, 0.15], T: 1.15, expect: [], guess: [37.58, 12.98, -1.24] },
    { from: [5.2, 2.5, -0.2], T: 1.15, expect: [], guess: [-37.68, 13.38, 1.24] },
  ],
  map: { sx: UX, sy: UY, sz: UZ, ox: 0, oy: FY, oz: Z_MID },
  ballR: CORK_R,
  slowmo: 1,
  players: [
    { shots: [0], racket: RACKET, style: OVERHEAD },
    { shots: [1], racket: RACKET, style: OVERHEAD },
  ],
  staticProgress: 0.22,
  paintStatic: paintCourt,
  trail: { count: 2, spacing: 0.012 },
  drawBall(g, ctx, ball, impact) {
    drawShuttle(g, ctx, ball.pos, shuttleAngle(ball), impact);
  },
};

export const createBadmintonScene = createRallyScene(BADMINTON_RALLY);
