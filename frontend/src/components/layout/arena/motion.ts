import type { Vec3 } from './types';
import { spline, add, scale, cross, norm, type RacketPose } from './gear';

/*
 * Ruch rakiety prowadzonej przez niewidocznego gracza.
 *
 * Rakieta nie kręci się wokół własnej głowy jak wskazówka zegara — prowadzi
 * ją dłoń: punkt chwytu jedzie po gładkiej krzywej (przygotowanie, zamach,
 * kontakt, wymach, powrót), a rakieta obraca się wokół nadgarstka. W chwili
 * kontaktu dwa warunki wynikają z fizyki, nie z animacji:
 *  - środek głowy jest dokładnie za piłką,
 *  - normalna twarzy to dwusieczna kierunków nadlotu i wylotu piłki
 *    (tak ustawiona płaszczyzna odbija piłkę w nowym kierunku).
 * Reszta zamachu to klucze względem kontaktu, specyficzne dla dyscypliny.
 */

export interface StrokeKey {
  /** Czas względem kontaktu (s, czas rzeczywisty). */
  t: number;
  /** Przesunięcie dłoni względem kontaktu: [w przód lotu, w górę, w bok] (jednostki sceny). */
  hand: Vec3;
  /** Obroty względem ułożenia w kontakcie (stopnie): wokół pionu, pochylenie trzonka, skręt twarzy. */
  yaw: number;
  pitch: number;
  roll: number;
  /** Uniesienie głowy w płaszczyźnie twarzy (stopnie) — np. „rakieta w górze” w squashu. */
  tilt?: number;
}

export interface StrokeStyle {
  /** Klucze od przygotowania do końca powrotu; pierwszy i ostatni to pozycja gotowości. */
  keys: readonly StrokeKey[];
  /** Kierunek, w którym mniej więcej celuje trzonek w chwili kontaktu (świat). */
  axisHint: Vec3;
  /** 0–1: ile twarzy obrócić ku kamerze — czytelność bez utraty fizycznego ułożenia. */
  faceBias: number;
  /** Mikroruch w gotowości (jednostki) — gracz nie stoi jak posąg. */
  idle: number;
  /**
   * Lustro obrotów wokół pionu i skrętu twarzy. Domyślnie wynika z kierunku
   * gry (gracz grający w stronę −x jest lustrzanym odbiciem); squash, gdzie
   * obaj grają w ścianę, ustawia je jawnie.
   */
  mirror?: 1 | -1;
  /**
   * Twarz w kontakcie zwrócona w kierunku lotu piłki (poziomo), a nie
   * w dwusieczną nadlotu i wylotu. Przy stromo spadającej lotce dwusieczna
   * patrzy w niebo i rakieta wyglądała, jakby uderzała krawędzią.
   */
  faceForward?: boolean;
}

export interface Contact {
  /** Chwila kontaktu w cyklu (s). */
  t: number;
  /** Środek piłki w chwili kontaktu (świat). */
  ball: Vec3;
  /** Kierunek nadlotu i wylotu piłki (świat, nieznormalizowane). */
  vIn: Vec3;
  vOut: Vec3;
}

/** Kierunek do kamery w układzie świata (y w dół) — z rzutu w kit.ts. */
const TO_CAMERA: Vec3 = norm([-0.305, -0.454, -0.837]);
const UP: Vec3 = [0, -1, 0];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const deg = Math.PI / 180;

/** Obrót wektora wokół osi (wzór Rodriguesa). */
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  if (!angle) return v;
  const c = Math.cos(angle), s = Math.sin(angle);
  const k = norm(axis);
  const kxv = cross(k, v);
  const kv = dot(k, v);
  return [
    v[0] * c + kxv[0] * s + k[0] * kv * (1 - c),
    v[1] * c + kxv[1] * s + k[1] * kv * (1 - c),
    v[2] * c + kxv[2] * s + k[2] * kv * (1 - c),
  ];
}

export interface RacketGeometry {
  /** Odległość od dłoni do środka głowy (jednostki). */
  reach: number;
  /** Promień piłki w jednostkach — środek głowy stoi o tyle za piłką. */
  ballR: number;
}

export interface Swing {
  pose: (t: number) => RacketPose;
  /** Czy trwa kontakt (okno ±`window` s) — do podświetlenia rakiety. */
  hitting: (t: number, window?: number) => boolean;
  /** 0–1: zbliżanie się do kontaktu, do delikatnego rozjaśnienia ramy. */
  charge: (t: number) => number;
}

/**
 * Buduje ruch rakiety jednego gracza z jego kontaktów w cyklu (zwykle jeden).
 * Między zamachami rakieta wraca do gotowości z pierwszego/ostatniego klucza.
 */
export function buildSwing(contacts: readonly Contact[], cycle: number, style: StrokeStyle, geo: RacketGeometry): Swing {
  const frames = contacts.map(c => {
    const vin = norm(c.vIn), vout = norm(c.vOut);
    let n = style.faceForward
      ? norm([vout[0], 0, vout[2]])
      : norm([vout[0] - vin[0], vout[1] - vin[1], vout[2] - vin[2]]);
    n = norm(add(scale(n, 1 - style.faceBias), scale(TO_CAMERA, style.faceBias * (dot(n, TO_CAMERA) >= 0 ? 1 : -1))));
    const hint = norm(style.axisHint);
    const axis = norm(add(hint, scale(n, -dot(hint, n))));
    const width = norm(cross(n, axis));
    // Układ zamachu: „w przód” = poziomy kierunek wylotu piłki.
    const fwd = norm([vout[0], 0, vout[2]]);
    const side = norm(cross(fwd, UP));
    const hand = add(add(c.ball, scale(n, -geo.ballR)), scale(axis, -geo.reach));
    const mirror = style.mirror ?? (fwd[0] < -0.2 ? -1 : 1);
    return { c, n, axis, width, fwd, side, hand, mirror };
  });

  const keys = style.keys;
  const channel = (pick: (k: StrokeKey) => number) => keys.map(k => [k.t, pick(k)] as const);
  const chHx = channel(k => k.hand[0]);
  const chHy = channel(k => k.hand[1]);
  const chHz = channel(k => k.hand[2]);
  const chYaw = channel(k => k.yaw);
  const chPitch = channel(k => k.pitch);
  const chRoll = channel(k => k.roll);
  const chTilt = channel(k => k.tilt ?? 0);
  const first = keys[0].t, last = keys[keys.length - 1].t;

  /** Najbliższy kontakt i czas względem niego (z zawinięciem cyklu). */
  const nearest = (t: number) => {
    let best = frames[0], bestS = Infinity;
    for (const f of frames) {
      let s = ((t - f.c.t) % cycle + cycle) % cycle;
      if (s > cycle / 2) s -= cycle;
      if (Math.abs(s) < Math.abs(bestS)) { best = f; bestS = s; }
    }
    return { f: best, s: bestS };
  };

  const pose = (t: number): RacketPose => {
    const { f, s } = nearest(t);
    const inStroke = s >= first && s <= last;
    const k = inStroke ? s : (s < first ? first : last);
    const hx = spline(chHx, k), hy = spline(chHy, k), hz = spline(chHz, k);
    const yaw = spline(chYaw, k) * deg * f.mirror;
    const pitch = spline(chPitch, k) * deg;
    const roll = spline(chRoll, k) * deg * f.mirror;
    const tilt = spline(chTilt, k) * deg;
    // Gotowość: drobne „bujanie” — oddech i przestępowanie z nogi na nogę.
    const breathe = inStroke ? 0 : Math.sin(t * 5.1 + f.c.t * 3) * style.idle;

    // Skręt twarzy wokół trzonka, pochylenie trzonka, obrót wokół pionu.
    let width = rotate(f.width, f.axis, roll);
    let axis = rotate(f.axis, width, pitch);
    if (tilt) {
      // Oś obrotu w płaszczyźnie twarzy dobrana tak, żeby dodatni kąt zawsze
      // podnosił głowę rakiety — niezależnie od strony gracza i lustra.
      let normal = cross(axis, width);
      if (dot(cross(normal, axis), UP) < 0) normal = scale(normal, -1);
      axis = rotate(axis, normal, tilt);
      width = rotate(width, normal, tilt);
    }
    axis = rotate(axis, UP, yaw);
    width = rotate(width, UP, yaw);

    const hand = add(add(add(f.hand, scale(f.fwd, hx)), scale(UP, hy + breathe)), scale(f.side, hz));
    return { hand, dir: norm(axis), width: norm(width) };
  };

  const hitting = (t: number, window = 0.045) => Math.abs(nearest(t).s) < window;
  const charge = (t: number) => {
    const s = nearest(t).s;
    return s < 0 ? Math.max(0, 1 + s / 0.25) : Math.max(0, 1 - s / 0.08);
  };
  return { pose, hitting, charge };
}
