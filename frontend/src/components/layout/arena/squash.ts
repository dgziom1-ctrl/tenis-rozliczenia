import type { SceneContext, ScreenPoint, Vec3 } from './types';
import { quad, rgba, seg } from './kit';
import { SQUASH_MODEL, drawBall, type RacketSpec } from './gear';
import { createRallyScene, type RallySceneConfig } from './rallyScene';
import type { StrokeStyle } from './motion';

/*
 * Squash — jedyna scena bez siatki. Kort leży jak pozostałe: długość
 * (9,75 m) wzdłuż kadru, ściana czołowa po prawej, szerokość (6,4 m)
 * w głąb. Wcześniej kort stał w poprzek, z długością w głąb — w tej kamerze
 * głębia jest mocno skrócona, więc wyglądał na szeroki, płytki i odległy.
 *
 * Fizyka: piłka 24 g (prędkość graniczna ok. 25 m/s), martwa w odbiciu —
 * od ściany czołowej oddaje ok. połowy prędkości, od podłogi niewiele ponad
 * jedną trzecią, więc po koźle ledwie się podnosi i gra toczy się nisko.
 * Obaj gracze stoją w tylnej połowie, obok siebie, i grają w ścianę czołową.
 */

const XL = 110;      // pół-długość kortu (x): ściana czołowa w +XL, tylna w −XL
const ZW = 44;       // pół-szerokość kortu (z)
const FY = 10;       // poziom podłogi w kadrze
const SLAB = 4;
const WALL_H = 50;   // wysokość ściany czołowej (nieco ponad linię autu)
const OUT = 46;      // linia autu na ścianie czołowej (4,57 m)
const GLASS_H = 34;  // szklana ściana tylna

/** Metry → jednostki: kort 9,75 × 6,4 m, linia autu 4,57 m. */
const UX = XL / 4.875;
const UZ = ZW / 3.2;
const UY = OUT / 4.57;

const SERVICE = 1.78 * UY;       // linia serwisowa na ścianie
const TIN = 0.48 * UY;           // górna krawędź pasa „tin”
const OUT_BACK = 2.13 * UY;      // linia autu na ścianie bocznej przy tylnej ścianie
const SHORT_X = (4.875 - 5.44) * UX; // linia krótka na podłodze
const BOX = 1.6;                  // bok kwadratu serwisowego (m)

function paintCourt(sg: CanvasRenderingContext2D, { P, proj, lightMode }: SceneContext) {
  const p = (x: number, y: number, z: number) => proj(x, FY + y, z);

  /* Podłoga */
  const FL = p(-XL, 0, -ZW), FR = p(XL, 0, -ZW), BR = p(XL, 0, ZW), BL = p(-XL, 0, ZW);
  const fg = sg.createLinearGradient(BL[0], BL[1], FL[0], FL[1]);
  fg.addColorStop(0, P.tableFrom); fg.addColorStop(1, P.tableTo);
  quad(sg, [FL, FR, BR, BL], fg);
  /* Deski parkietu — wzdłuż kortu. */
  for (let i = 1; i < 12; i++) {
    const z = -ZW + (i / 12) * ZW * 2;
    seg(sg, p(-XL, 0, z), p(XL, 0, z), rgba(P.grid, lightMode ? 0.045 : 0.025), 0.55);
  }

  /* Linie: krótka, środkowa w tylnej połowie i kwadraty serwisowe. */
  const line = rgba(P.edge, lightMode ? 0.45 : 0.4);
  seg(sg, p(SHORT_X, 0, -ZW), p(SHORT_X, 0, ZW), line, 1);
  seg(sg, p(SHORT_X, 0, 0), p(-XL, 0, 0), line, 1);
  const boxX = SHORT_X - BOX * UX, boxZ = ZW - BOX * UZ;
  for (const s of [-1, 1]) {
    seg(sg, p(boxX, 0, s * ZW), p(boxX, 0, s * boxZ), line, 0.9);
    seg(sg, p(boxX, 0, s * boxZ), p(SHORT_X, 0, s * boxZ), line, 0.9);
  }
  seg(sg, BL, BR, rgba(P.grid, lightMode ? 0.24 : 0.2), 1);

  /* Przednia krawędź płyty */
  const FL2 = p(-XL, SLAB, -ZW), FR2 = p(XL, SLAB, -ZW);
  const ff = sg.createLinearGradient(0, FL[1], 0, FL2[1]);
  ff.addColorStop(0, rgba(P.accentDeep, lightMode ? 0.18 : 0.35));
  ff.addColorStop(1, rgba(P.accentDeep, 0.04));
  quad(sg, [FL, FR, FR2, FL2], ff);
  sg.save();
  sg.shadowBlur = lightMode ? 3 : 5;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.35 : 0.5);
  seg(sg, FL, FR, rgba(P.accent, lightMode ? 0.65 : 0.8), 1.8);
  sg.restore();

  /* Szklana ściana tylna (po lewej) — jak na kortach z przeszkloną tyłem. */
  const gN0 = p(-XL, 0, -ZW), gF0 = BL, gN1 = p(-XL, -GLASS_H, -ZW), gF1 = p(-XL, -GLASS_H, ZW);
  const gg = sg.createLinearGradient(0, gF1[1], 0, gN0[1]);
  gg.addColorStop(0, rgba(P.edge, lightMode ? 0.08 : 0.07));
  gg.addColorStop(1, rgba(P.deepShade, 0.02));
  quad(sg, [gN0, gF0, gF1, gN1], gg);
  seg(sg, gN1, gF1, rgba(P.accent, lightMode ? 0.4 : 0.42), 1);
  seg(sg, gN0, gN1, rgba(P.edge, lightMode ? 0.25 : 0.28), 0.9);

  /* Dalsza ściana boczna z ukośną linią autu (z 4,57 m przy ścianie czołowej do 2,13 m z tyłu). */
  const sBack = BL, sFront = BR, sFrontTop = p(XL, -WALL_H, ZW), sBackTop = p(-XL, -OUT_BACK - 4, ZW);
  const sideGrad = sg.createLinearGradient(sBack[0], 0, sFront[0], 0);
  sideGrad.addColorStop(0, rgba(P.edge, lightMode ? 0.04 : 0.03));
  sideGrad.addColorStop(1, rgba(P.edge, lightMode ? 0.09 : 0.08));
  quad(sg, [sBack, sFront, sFrontTop, sBackTop] as ScreenPoint[], sideGrad);
  for (let i = 1; i < 6; i++) {
    const x = -XL + (i / 6) * XL * 2;
    seg(sg, p(x, 0, ZW), p(x, -OUT_BACK - (OUT - OUT_BACK) * (i / 6) - 2, ZW), rgba(P.grid, lightMode ? 0.06 : 0.045), 0.6);
  }
  sg.save();
  sg.shadowBlur = lightMode ? 2 : 4;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.3 : 0.6);
  seg(sg, p(XL, -OUT, ZW), p(-XL, -OUT_BACK, ZW), rgba(P.accent, lightMode ? 0.55 : 0.6), 1.2);
  sg.restore();

  /* Ściana czołowa (po prawej) */
  const wN0 = FR, wF0 = BR, wF1 = p(XL, -WALL_H, ZW), wN1 = p(XL, -WALL_H, -ZW);
  const wg = sg.createLinearGradient(0, Math.min(wF1[1], wN1[1]), 0, Math.max(wN0[1], wF0[1]));
  wg.addColorStop(0, rgba(P.edge, lightMode ? 0.11 : 0.11));
  wg.addColorStop(1, rgba(P.deepShade, lightMode ? 0.05 : 0.07));
  quad(sg, [wN0, wF0, wF1, wN1], wg);
  for (let i = 1; i < 6; i++) {
    const z = -ZW + (i / 6) * ZW * 2;
    seg(sg, p(XL, 0, z), p(XL, -WALL_H, z), rgba(P.grid, lightMode ? 0.07 : 0.05), 0.6);
  }
  /* Tin: świecący pas przy podłodze — piłka w nim jest „zła”. */
  quad(sg, [wN0, wF0, p(XL, -TIN, ZW), p(XL, -TIN, -ZW)], rgba(P.accent, lightMode ? 0.16 : 0.2));
  seg(sg, p(XL, -SERVICE, -ZW), p(XL, -SERVICE, ZW), rgba(P.edge, lightMode ? 0.45 : 0.5), 1);
  sg.save();
  sg.shadowBlur = lightMode ? 3 : 6;
  sg.shadowColor = rgba(P.accent, lightMode ? 0.4 : 0.85);
  seg(sg, p(XL, -TIN, -ZW), p(XL, -TIN, ZW), rgba(P.accent, lightMode ? 0.7 : 0.85), 1.6);
  seg(sg, p(XL, -OUT, -ZW), p(XL, -OUT, ZW), lightMode ? rgba(P.accent, 0.7) : rgba(P.netTop, 0.85), 1.6);
  sg.restore();
  seg(sg, wN1, wF1, rgba(P.edge, lightMode ? 0.3 : 0.32), 0.9);
  seg(sg, wN0, wN1, rgba(P.edge, lightMode ? 0.45 : 0.55), 1.3);
  seg(sg, wF0, wF1, rgba(P.edge, lightMode ? 0.35 : 0.4), 1);
}

const BALL_R = 3.2;

const RACKET: RacketSpec = {
  model: SQUASH_MODEL,
  headLen: 7,
  headWid: 5.4,
  shaft: 7,
  handle: 7,
  shaftWidth: 2,
  solid: false,
};

/**
 * Szeroki zamach z boku: rakieta uniesiona („racket up”) przed uderzeniem,
 * prowadzona nisko przez kontakt obok ciała i wymach w stronę ściany.
 * Bliższy gracz uderza po stronie bliższej ściany bocznej, dalszy po
 * stronie dalszej — obroty są lustrzane. `outward` to kierunek na zewnątrz
 * (oś z świata: −1 do kamery, +1 od kamery).
 */
const sideSwing = (outward: 1 | -1): StrokeStyle => ({
  keys: [
    { t: -0.55, hand: [-1, 5, 1], yaw: 10, pitch: 0, roll: 0, tilt: 55 },
    { t: -0.22, hand: [-4, 6, 2.5], yaw: 70, pitch: 0, roll: -10, tilt: 75 },
    { t: -0.07, hand: [-2, 2, 1], yaw: 35, pitch: 0, roll: -5, tilt: 25 },
    { t: 0, hand: [0, 0, 0], yaw: 0, pitch: 0, roll: 0 },
    { t: 0.13, hand: [4, 3, -2], yaw: -75, pitch: 0, roll: 10, tilt: 45 },
    { t: 0.45, hand: [-1, 5, 1], yaw: 10, pitch: 0, roll: 0, tilt: 55 },
  ].map(k => ({ ...k, hand: [k.hand[0], k.hand[1], k.hand[2] * -outward] as Vec3 })),
  axisHint: [-0.15, -0.6, outward * 0.8],
  faceBias: 0.45,
  idle: 0.5,
  mirror: outward === -1 ? 1 : -1,
});

export const SQUASH_RALLY: RallySceneConfig = {
  physics: {
    g: 9.81, vt: 25, magnus: 0, floorE: 0.38, floorFriction: 0.8,
    walls: [
      { axis: 0, at: 4.875 - BALL_R / UX, side: 1, e: 0.5, friction: 0.85, kind: 'front' },
      { axis: 0, at: -4.875 + BALL_R / UX, side: -1, e: 0.5, friction: 0.85, kind: 'back' },
      { axis: 2, at: 3.2 - BALL_R / UZ, side: 1, e: 0.55, friction: 0.85, kind: 'side' },
      { axis: 2, at: -3.2 + BALL_R / UZ, side: -1, e: 0.55, friction: 0.85, kind: 'side' },
    ],
  },
  shots: [
    { from: [-1.85, 0.2, -1.45], T: 1.3, expect: ['front', 'floor'], guess: [19.77, 6.22, 2.92] },
    { from: [-2.95, 0.2, 1.45], T: 1.3, expect: ['front', 'floor'], guess: [18.8, 6.09, -2.89] },
  ],
  map: { sx: UX, sy: UY, sz: UZ, ox: 0, oy: FY, oz: 0 },
  ballR: BALL_R,
  slowmo: 1,
  players: [
    { shots: [0], racket: RACKET, style: sideSwing(-1) },
    { shots: [1], racket: RACKET, style: sideSwing(1) },
  ],
  staticProgress: 0.3,
  paintStatic: paintCourt,
  flashes: { front: { size: 11, dur: 0.18 }, floor: { size: 6, dur: 0.08 }, side: { size: 8, dur: 0.12 } },
  trail: { count: 4, spacing: 0.01 },
  drawBall(g, ctx, ball, impact) {
    drawBall(g, ctx, ball.pos, { radius: BALL_R, impact, spin: ball.t * Math.PI * 2 * 1.8, dots: true });
  },
};

export const createSquashScene = createRallyScene(SQUASH_RALLY);
