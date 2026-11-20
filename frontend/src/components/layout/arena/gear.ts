import type { SceneContext, Vec3 } from './types';
import { clamp01, rgba } from './kit';

/*
 * Sprzęt wspólny dla scen z rakietami (padel, badminton, squash).
 *
 * Głowa rakiety jest opisana w lokalnym układzie (u — w poprzek, v — wzdłuż,
 * oba w zakresie −1…1) i rzutowana afinicznie przez trzy rzutowane punkty:
 * środek i końce obu półosi. To dokładnie ten sam trik, którym ping-pong
 * rysuje okrągłą rakietkę, tylko uogólniony na dowolny kształt — dzięki temu
 * naciąg, otworki i rama skracają się w perspektywie razem z głową.
 *
 * Kształty, naciąg i otworki liczymy raz (przy imporcie modułu), w pętli
 * zostaje mapowanie punktów i kilka ścieżek.
 */

type L2 = [number, number];

export interface RacketModel {
  /** Zamknięty obrys głowy (lokalnie). */
  outline: L2[];
  /** Odcinki naciągu — puste dla pełnej twarzy. */
  strings: [L2, L2][];
  /** Otworki w pełnej twarzy (padel). */
  holes: L2[];
  /** Rama pod głową (gardło / mostek), lokalnie: v < −1. */
  throat: L2[][];
}

export interface RacketSpec {
  model: RacketModel;
  /** Pół-długość głowy wzdłuż osi rakiety (jednostki świata). */
  headLen: number;
  /** Pół-szerokość głowy. */
  headWid: number;
  /** Odległość od dołu głowy do dłoni. */
  shaft: number;
  /** Długość uchwytu za dłonią. */
  handle: number;
  /** Grubość trzonka przy skali 1. */
  shaftWidth: number;
  /** Pełna twarz (padel) zamiast naciągu. */
  solid: boolean;
  /**
   * Ile obrysu zajmuje okładzina pełnej twarzy (0–1). Padel ma szeroką ramę;
   * w ping-pongu okładzina pokrywa prawie całe drewno.
   */
  faceInset?: number;
  /** Grubość ramy (mnożnik). Rakietka do ping-ponga nie ma ramy — tylko krawędź drewna. */
  rim?: number;
}

/** Ułożenie rakiety w świecie: punkt chwytu i dwie prostopadłe osie głowy. */
export interface RacketPose {
  hand: Vec3;
  /** Kierunek od dłoni do czubka (wektor jednostkowy). */
  dir: Vec3;
  /** Oś szerokości głowy (wektor jednostkowy, prostopadły do `dir`). */
  width: Vec3;
}

/* ── Modele ───────────────────────────────────────────────────────── */

function outlineOf(shape: (theta: number) => L2, n = 28): L2[] {
  return Array.from({ length: n }, (_, i) => shape((i / n) * Math.PI * 2));
}

/** Przecięcia prostej z wielokątem — końce struny wewnątrz obrysu. */
function chord(outline: L2[], axis: 'u' | 'v', at: number): [L2, L2] | null {
  const hits: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const ia = axis === 'u' ? a[1] : a[0], ib = axis === 'u' ? b[1] : b[0];
    if ((ia - at) * (ib - at) > 0 || ia === ib) continue;
    const k = (at - ia) / (ib - ia);
    hits.push(axis === 'u' ? a[0] + (b[0] - a[0]) * k : a[1] + (b[1] - a[1]) * k);
  }
  if (hits.length < 2) return null;
  const lo = Math.min(...hits), hi = Math.max(...hits);
  // Struny kończą się kawałek przed ramą, żeby nie przebijały obrysu.
  const inset = 0.05;
  if (hi - lo < inset * 3) return null;
  return axis === 'u'
    ? [[lo + inset, at], [hi - inset, at]]
    : [[at, lo + inset], [at, hi - inset]];
}

function stringsFor(outline: L2[], cross: number, mains: number): [L2, L2][] {
  const out: [L2, L2][] = [];
  for (let i = 1; i < cross; i++) {
    const c = chord(outline, 'u', -1 + (2 * i) / cross);
    if (c) out.push(c);
  }
  for (let i = 1; i < mains; i++) {
    const c = chord(outline, 'v', -1 + (2 * i) / mains);
    if (c) out.push(c);
  }
  return out;
}

function inside(outline: L2[], [x, y]: L2): boolean {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i], [xj, yj] = outline[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Badminton: lekko jajowata owalna główka, długi cienki trzonek z „T” u nasady. */
const BADMINTON_OUTLINE = outlineOf(t => [Math.sin(t) * (0.96 + 0.04 * Math.cos(t)), Math.cos(t)]);
export const BADMINTON_MODEL: RacketModel = {
  outline: BADMINTON_OUTLINE,
  strings: stringsFor(BADMINTON_OUTLINE, 10, 8),
  holes: [],
  throat: [[[-0.22, -0.97], [0, -1.12], [0.22, -0.97]]],
};

/** Squash: kropla zwężająca się ku gardłu i otwarte gardło z dwóch ramion. */
const SQUASH_OUTLINE = outlineOf(t => [Math.sin(t) * (0.8 + 0.2 * Math.cos(t)), Math.cos(t)]);
export const SQUASH_MODEL: RacketModel = {
  outline: SQUASH_OUTLINE,
  strings: stringsFor(SQUASH_OUTLINE, 11, 8),
  holes: [],
  throat: [
    [[-0.5, -0.86], [-0.16, -1.55], [0, -1.78]],
    [[0.5, -0.86], [0.16, -1.55], [0, -1.78]],
  ],
};

/** Padel: zaokrąglony „superelipsoidalny” kształt, pełna twarz z otworkami i mostek. */
const superellipse = (t: number, n: number): L2 => {
  const c = Math.cos(t), s = Math.sin(t);
  return [Math.sign(s) * Math.pow(Math.abs(s), 2 / n), Math.sign(c) * Math.pow(Math.abs(c), 2 / n)];
};
const PADEL_OUTLINE = outlineOf(t => {
  const [u, v] = superellipse(t, 2.5);
  // Ciut szersza u góry: klasyczny kształt „łzy” padlowej.
  return [u * (0.9 + 0.1 * v), v];
});
const PADEL_HOLES: L2[] = (() => {
  const holes: L2[] = [];
  const step = 0.3;
  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const p: L2 = [col * step + (row % 2 ? step / 2 : 0), row * step * 0.88];
      // Środek twarzy jest pełny (tam pada logo/sweet spot), otworki idą wokół.
      const r = Math.hypot(p[0], p[1] * 0.9);
      if (r < 0.2) continue;
      const shrunk = PADEL_OUTLINE.map(([u, v]) => [u * 0.8, v * 0.84] as L2);
      if (inside(shrunk, p)) holes.push(p);
    }
  }
  return holes;
})();
export const PADEL_MODEL: RacketModel = {
  outline: PADEL_OUTLINE,
  strings: [],
  holes: PADEL_HOLES,
  throat: [
    [[-0.62, -0.78], [-0.2, -1.32], [0, -1.42]],
    [[0.62, -0.78], [0.2, -1.32], [0, -1.42]],
    [[-0.34, -1.0], [0, -1.12], [0.34, -1.0]],
  ],
};

/** Ping-pong: okrągła rakietka z okładziną, krótka szyjka przy uchwycie. */
// Blat 150 × 158 mm: prawie okrągły, minimalnie wyższy niż szerszy, z płaskim „ramieniem” przy uchwycie.
const PINGPONG_OUTLINE = outlineOf(t => [Math.sin(t) * (1 - 0.06 * Math.max(0, -Math.cos(t))), Math.cos(t)]);
export const PINGPONG_MODEL: RacketModel = {
  outline: PINGPONG_OUTLINE,
  strings: [],
  holes: [],
  throat: [[[-0.3, -0.93], [-0.2, -1.08], [0.2, -1.08], [0.3, -0.93]]],
};

/* ── Wektory ──────────────────────────────────────────────────────── */

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* ── Krzywe zamachu ──────────────────────────────────────────────── */

/**
 * Catmull-Rom po kluczach (faza, wartość). Prędkość jest ciągła przez klucz,
 * więc rakieta nie „staje” w chwili kontaktu — przechodzi przez nią z rozpędem.
 * Poza zakresem kluczy zwraca wartości skrajne.
 */
export function spline(keys: readonly (readonly [number, number])[], s: number): number {
  if (s <= keys[0][0]) return keys[0][1];
  const last = keys.length - 1;
  if (s >= keys[last][0]) return keys[last][1];
  let i = 0;
  while (i < last - 1 && s > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(last, i + 2)];
  const t = (s - p1[0]) / (p2[0] - p1[0]);
  // Styczne skalowane do nierównych odstępów kluczy.
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]);
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}

/* ── Pamięć podręczna kształtów ──────────────────────────────────── */

/** Promień otworka w jednostkach lokalnych głowy. */
const HOLE_R = 0.062;

const insets = new WeakMap<RacketModel, Map<string, L2[]>>();
/** Obrys pomniejszony do wewnątrz — liczony raz, nie co klatkę. */
function insetOf(model: RacketModel, ku: number, kv: number): L2[] {
  let byScale = insets.get(model);
  if (!byScale) { byScale = new Map(); insets.set(model, byScale); }
  const key = `${ku}:${kv}`;
  let pts = byScale.get(key);
  if (!pts) {
    pts = model.outline.map(([a, b]) => [a * ku, b * kv] as L2);
    byScale.set(key, pts);
  }
  return pts;
}

const holePaths = new WeakMap<RacketModel, Path2D | null>();
/** Ścieżka wszystkich otworków w układzie lokalnym; `null`, gdy brak `Path2D` (jsdom). */
function holesPath(model: RacketModel): Path2D | null {
  if (holePaths.has(model)) return holePaths.get(model) ?? null;
  let p: Path2D | null = null;
  if (typeof Path2D !== 'undefined' && model.holes.length) {
    p = new Path2D();
    for (const [x, y] of model.holes) {
      p.moveTo(x + HOLE_R, y);
      p.arc(x, y, HOLE_R, 0, Math.PI * 2);
    }
  }
  holePaths.set(model, p);
  return p;
}

/* ── Rysowanie rakiety ───────────────────────────────────────────── */

interface DrawRacketOptions {
  hitting: boolean;
  impact: number;
  /** 0–1: jak blisko kontaktu — rozjaśnia ramę jeszcze przed uderzeniem. */
  charge?: number;
}

export function drawRacket(
  g: CanvasRenderingContext2D,
  { P, proj, glows, lightMode }: SceneContext,
  spec: RacketSpec,
  pose: RacketPose,
  { hitting, impact, charge = 0 }: DrawRacketOptions,
) {
  const { model, headLen, headWid } = spec;
  const C = add(pose.hand, scale(pose.dir, spec.shaft + headLen));
  const pc = proj(C[0], C[1], C[2]);
  const pv = proj(...add(C, scale(pose.dir, headLen)));
  const pu = proj(...add(C, scale(pose.width, headWid)));
  const ux = pu[0] - pc[0], uy = pu[1] - pc[1];
  const vx = pv[0] - pc[0], vy = pv[1] - pc[1];
  const map = ([a, b]: L2): L2 => [pc[0] + ux * a + vx * b, pc[1] + uy * a + vy * b];
  const path = (pts: L2[], close: boolean) => {
    g.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = map(p);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    });
    if (close) g.closePath();
  };

  const glowK = Math.max(hitting ? 1 : 0, charge * 0.6);

  /* Poświata pod głową — sprite rozciągnięty tym samym przekształceniem. */
  const halo = hitting ? glows.hit : glows.idle;
  if (halo) {
    const k = 1.9 * (hitting ? 1 + impact * 0.12 : 1);
    g.save();
    g.transform(ux * k, uy * k, vx * k, vy * k, pc[0], pc[1]);
    g.globalAlpha = hitting ? 0.7 + 0.2 * impact : 0.38 + 0.2 * charge;
    g.drawImage(halo, -1, -1, 2, 2);
    g.restore();
  }

  /* Uchwyt i trzonek — w świecie, żeby grubość szła za perspektywą. */
  const headBase = add(C, scale(pose.dir, -headLen));
  const gripEnd = add(pose.hand, scale(pose.dir, -spec.handle));
  const pHand = proj(...pose.hand), pBase = proj(...headBase), pGrip = proj(...gripEnd);
  g.save();
  g.lineCap = 'round';
  g.strokeStyle = rgba(P.handle, 0.95);
  g.lineWidth = spec.shaftWidth * pHand[2];
  g.beginPath(); g.moveTo(pHand[0], pHand[1]); g.lineTo(pBase[0], pBase[1]); g.stroke();
  /* Neonowa żyłka trzonka: ciemny trzonek badmintona i squasha znikał na
     ciemnym tle i głowa wyglądała jak oderwana od rakiety. */
  g.strokeStyle = hitting ? rgba(P.accent, 0.75) : rgba(P.glowIdle, 0.45 + 0.2 * charge);
  g.lineWidth = Math.max(0.7, spec.shaftWidth * 0.45 * pHand[2]);
  g.stroke();
  g.strokeStyle = rgba(P.handle, 0.95);
  g.lineWidth = (spec.shaftWidth + 2.6) * pGrip[2];
  g.beginPath(); g.moveTo(pGrip[0], pGrip[1]); g.lineTo(pHand[0], pHand[1]); g.stroke();
  g.strokeStyle = rgba(P.handleLine, 0.65);
  g.lineWidth = (spec.shaftWidth + 2.6) * 0.42 * pGrip[2];
  g.stroke();
  g.restore();

  /* Twarz: pełna (padel) albo przezroczysta z naciągiem. */
  if (spec.solid) {
    const r = Math.max(Math.hypot(ux, uy), Math.hypot(vx, vy));
    const body = g.createRadialGradient(pc[0] - ux * 0.2 - vx * 0.2, pc[1] - uy * 0.2 - vy * 0.2, 0, pc[0], pc[1], r * 1.05);
    body.addColorStop(0, P.bodyFrom); body.addColorStop(0.76, P.bodyMid); body.addColorStop(1, P.bodyTo);
    path(model.outline, true);
    g.fillStyle = body; g.fill();
    /* Wewnętrzna płyta — jaśniejsza, jak okładzina w ping-pongu. */
    const face = g.createRadialGradient(pc[0] - ux * 0.15 + vx * 0.2, pc[1] - uy * 0.15 + vy * 0.2, 0, pc[0], pc[1], r * 0.9);
    face.addColorStop(0, hitting ? rgba(P.rubberHit, 0.9) : rgba(P.rubberIdle, 0.62 + 0.2 * charge));
    face.addColorStop(1, hitting ? rgba(P.rubberHitEnd, 0.7) : rgba(P.rubberIdleEnd, 0.42));
    const inset = spec.faceInset ?? 0.85;
    path(insetOf(model, inset, inset + 0.02), true);
    g.fillStyle = face; g.fill();
    /* Otworki: gotowa ścieżka w układzie lokalnym, wypełniona pod tym samym
       przekształceniem co głowa — jedno wywołanie zamiast kilkudziesięciu łuków,
       a otworki skracają się w perspektywie razem z twarzą. */
    g.fillStyle = lightMode ? rgba(P.handle, 0.32) : P.bodyTo;
    const holes = holesPath(model);
    if (holes) {
      g.save();
      g.transform(ux, uy, vx, vy, pc[0], pc[1]);
      g.fill(holes);
      g.restore();
    } else {
      const hr = Math.max(0.3, Math.min(Math.hypot(ux, uy), Math.hypot(vx, vy)) * HOLE_R);
      g.beginPath();
      for (const h of model.holes) {
        const [x, y] = map(h);
        g.moveTo(x + hr, y);
        g.arc(x, y, hr, 0, Math.PI * 2);
      }
      g.fill();
    }
  } else {
    path(model.outline, true);
    g.fillStyle = rgba(P.accent, lightMode ? 0.06 : 0.07 + 0.08 * glowK);
    g.fill();
    g.beginPath();
    for (const [a, b] of model.strings) {
      const [ax, ay] = map(a), [bx, by] = map(b);
      g.moveTo(ax, ay); g.lineTo(bx, by);
    }
    g.strokeStyle = rgba(hitting ? P.accent : P.rubberIdle, hitting ? 0.62 + 0.25 * impact : (lightMode ? 0.4 : 0.3) + 0.15 * charge);
    g.lineWidth = 0.55;
    g.stroke();
  }

  /* Gardło / mostek. */
  g.lineJoin = 'round';
  g.strokeStyle = hitting ? rgba(P.accent, 0.8) : rgba(P.glowIdle, 0.5 + 0.15 * charge);
  g.lineWidth = 1.3;
  g.beginPath();
  for (const line of model.throat) {
    line.forEach((pt, i) => {
      const [x, y] = map(pt);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    });
  }
  g.stroke();

  /* Rama: poświata, właściwa krawędź i cienka linia wewnętrzna. */
  path(model.outline, true);
  g.strokeStyle = hitting ? rgba(P.accent, 0.5 + 0.2 * impact) : rgba(P.glow, 0.28 + 0.12 * charge);
  g.lineWidth = 3.2 * (spec.rim ?? 1);
  g.stroke();
  g.strokeStyle = hitting ? rgba(P.accent, 0.95) : rgba(P.glowIdle, 0.6 + 0.25 * charge);
  g.lineWidth = 1.7 * (spec.rim ?? 1);
  g.stroke();
  if (!spec.solid) {
    path(insetOf(model, 0.93, 0.95), true);
    g.strokeStyle = rgba(P.edge, hitting ? 0.45 : 0.22);
    g.lineWidth = 0.6;
    g.stroke();
  }
  g.lineJoin = 'miter';
}

/* ── Piłka ────────────────────────────────────────────────────────── */

interface DrawBallOptions {
  radius: number;
  impact: number;
  /** Kąt obrotu piłki — przesuwa pasek/kropki. */
  spin?: number;
  /** Squash: dwie kropki zamiast paska rotacji. */
  dots?: boolean;
}

/*
 * Piłka jest zawsze kulą. Kreskówkowe zgniatanie przy kontakcie (squash
 * and stretch) wyglądało zabawnie zamiast realistycznie — prawdziwe
 * odkształcenie trwa milisekundy i przy tej skali jest niewidoczne.
 */
export function drawBall(
  g: CanvasRenderingContext2D,
  { P, proj, glows }: SceneContext,
  pos: Vec3,
  { radius, impact, spin = 0, dots = false }: DrawBallOptions,
) {
  const q = proj(pos[0], pos[1], pos[2]);
  const r = radius * q[2];

  if (glows.ball) {
    const gr = r * (3.1 + impact * 1.5);
    g.save();
    g.globalAlpha = Math.min(1, 0.62 + 0.38 * impact);
    g.drawImage(glows.ball, q[0] - gr, q[1] - gr, gr * 2, gr * 2);
    g.restore();
  }

  g.save();
  g.translate(q[0], q[1]);
  const bg = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  bg.addColorStop(0, P.ballCore); bg.addColorStop(0.46, P.ballMid); bg.addColorStop(1, P.ballEdge);
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
  g.fillStyle = bg; g.fill();

  g.save();
  g.beginPath(); g.arc(0, 0, r * 0.96, 0, Math.PI * 2); g.clip();
  if (dots) {
    /* Dwie kropki — znak rozpoznawczy piłki do squasha — obiegają kulę z rotacją. */
    for (const off of [0, Math.PI * 0.62]) {
      const a = spin + off;
      const x = Math.sin(a) * r * 0.55, y = Math.cos(a * 0.7) * r * 0.32 - r * 0.1;
      const vis = Math.cos(a);
      if (vis < -0.2) continue;
      g.beginPath();
      g.ellipse(x, y, r * 0.2 * (0.45 + 0.55 * Math.abs(vis)), r * 0.2, 0, 0, Math.PI * 2);
      g.fillStyle = rgba(P.accent, 0.55 + 0.4 * clamp01(vis));
      g.fill();
    }
  } else {
    const stripeY = Math.sin(spin) * r * 0.8;
    const vis = Math.abs(Math.cos(spin));
    const boost = vis + impact * 0.9;
    if (boost > 0.06) {
      const srx = r * Math.min(1, boost) * 0.92;
      g.beginPath();
      g.ellipse(0, stripeY, srx, Math.max(0.6, srx * 0.13), 0, 0, Math.PI * 2);
      g.strokeStyle = rgba(P.iceStripe, 0.12 + 0.35 * vis + 0.3 * impact);
      g.lineWidth = 1.2;
      g.stroke();
    }
  }
  g.restore();
  g.restore();
  return q;
}

/** Miękki cień na płaszczyźnie podłogi — słabnie z wysokością piłki. */
export function drawShadow(
  g: CanvasRenderingContext2D,
  { P, proj }: SceneContext,
  pos: Vec3,
  floorY: number,
  radius: number,
  maxHeight = 70,
) {
  const s = proj(pos[0], floorY, pos[2]);
  const h = Math.max(0, floorY - pos[1]);
  const a = 0.22 * (1 - Math.min(1, h / maxHeight));
  if (a <= 0.005) return;
  g.save();
  g.translate(s[0], s[1]);
  g.scale(1, 0.34);
  g.beginPath(); g.arc(0, 0, radius * s[2] * (1.5 + h / maxHeight), 0, Math.PI * 2);
  g.fillStyle = rgba(P.shadow, a);
  g.fill();
  g.restore();
}

/**
 * Krótki błysk w miejscu odbicia (podłoga, ściana, szyba). Zastąpił
 * rozchodzące się neonowe pierścienie — te wyglądały jak efekt z gry,
 * a nie jak kontakt piłki z powierzchnią. `k` 0→1 to wiek błysku.
 */
export function drawFlash(
  g: CanvasRenderingContext2D,
  { proj, glows, lightMode }: SceneContext,
  at: Vec3,
  k: number,
  size: number,
) {
  if (k <= 0 || k >= 1 || !glows.hit) return;
  const q = proj(at[0], at[1], at[2]);
  const fade = (1 - k) * (1 - k);
  const r = size * q[2] * (0.7 + 0.5 * k);
  g.save();
  g.globalAlpha = fade * (lightMode ? 0.45 : 0.6);
  g.drawImage(glows.hit, q[0] - r, q[1] - r, r * 2, r * 2);
  g.restore();
}

/**
 * Smuga ruchu: kilka bladych kopii piłki w miejscach, gdzie była przed
 * chwilą (punkty z prawdziwego toru, równe odstępy czasu). Szybka piłka
 * zostawia długą smugę, wolna prawie żadnej — dokładnie jak na powtórce
 * w telewizji, bez dorysowanych „śladów”.
 */
export function drawTrail(
  g: CanvasRenderingContext2D,
  { P, proj }: SceneContext,
  points: readonly Vec3[],
  radius: number,
  strength = 1,
) {
  points.forEach((p, i) => {
    const q = proj(p[0], p[1], p[2]);
    const k = 1 - (i + 1) / (points.length + 1);
    g.beginPath();
    g.arc(q[0], q[1], radius * q[2] * (0.55 + 0.4 * k), 0, Math.PI * 2);
    g.fillStyle = rgba(P.floorWash, 0.16 * k * strength);
    g.fill();
  });
}
