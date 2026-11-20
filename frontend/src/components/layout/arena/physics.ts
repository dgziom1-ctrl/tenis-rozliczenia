/*
 * Fizyka lotu piłki — w metrach i sekundach, niezależnie od rysowania.
 *
 * Wcześniej tor był sklejany z krzywych Béziera: każdy odcinek miał w praktyce
 * inną „grawitację”, a piłka przyspieszała i hamowała w poziomie bez powodu.
 * Oko od razu wyczuwa taki ruch jako sztuczny. Tu tor wynika z równań ruchu:
 * stała grawitacja, opór powietrza (prędkość graniczna danej piłki), efekt
 * Magnusa dla rotacji oraz odbicia od podłogi i ścian ze współczynnikiem
 * sprężystości i tarciem.
 *
 * Układ: x wzdłuż kortu, y w górę (wysokość nad podłogą), z w głąb (od kamery).
 * Każda scena sama mapuje metry na swój układ rysowania.
 */

export type V3 = [number, number, number];

export interface Wall {
  /** Oś prostopadła do ściany: 0 = x, 2 = z. */
  axis: 0 | 2;
  /** Położenie ściany na tej osi (m). */
  at: number;
  /** Z której strony nadlatuje piłka: +1 — ściana zatrzymuje ruch w stronę rosnących wartości. */
  side: 1 | -1;
  /** Współczynnik sprężystości w osi prostopadłej. */
  e: number;
  /** Ile prędkości stycznej zostaje po odbiciu (tarcie). */
  friction: number;
  /** Nazwa zdarzenia — sceny reagują na nią efektem (np. „glass”, „front”). */
  kind: string;
}

export interface Physics {
  /** Przyspieszenie ziemskie (m/s²). */
  g: number;
  /** Prędkość graniczna w powietrzu (m/s); `Infinity` wyłącza opór. */
  vt: number;
  /** Rotacja do przodu (topspin), 1/s: przyspieszenie Magnusa = magnus · |v|. */
  magnus: number;
  floorE: number;
  floorFriction: number;
  walls: readonly Wall[];
}

export interface FlightEvent {
  /** Czas od początku lotu (s). */
  t: number;
  kind: string;
  pos: V3;
}

export interface Flight {
  start: V3;
  v0: V3;
  /** Czas lotu (s). */
  T: number;
  dt: number;
  /** Pozycje co `dt`, spłaszczone [x, y, z, x, y, z, …]. */
  pos: Float64Array;
  /** Prędkości co `dt`, w tym samym układzie. */
  vel: Float64Array;
  events: FlightEvent[];
  /** Najwyższy punkt lotu (m). */
  apex: number;
}

/**
 * Krok symulacji. 1 ms wystarcza z zapasem dla piłek do 30 m/s. Solver
 * liczy tym samym krokiem co końcowy lot — inny krok dawał kilka
 * centymetrów rozjazdu w punkcie kontaktu.
 */
const DT = 1 / 1000;
/** Gruby krok tylko do wstępnego przeszukiwania kierunków. */
const SEARCH_DT = 1 / 200;

function step(p: number[], v: number[], ph: Physics, dt: number, onEvent: ((kind: string) => void) | null) {
  const speed = Math.hypot(v[0], v[1], v[2]);
  const k = Number.isFinite(ph.vt) ? ph.g / (ph.vt * ph.vt) : 0;
  let ax = -k * speed * v[0];
  let ay = -ph.g - k * speed * v[1];
  let az = -k * speed * v[2];
  if (ph.magnus) {
    // Magnus dla topspinu: wektor prostopadły do prędkości, „w dół” względem lotu.
    const vh = Math.hypot(v[0], v[2]);
    if (vh > 1e-6) {
      const hx = v[0] / vh, hz = v[2] / vh;
      ax += ph.magnus * v[1] * hx;
      ay += -ph.magnus * vh;
      az += ph.magnus * v[1] * hz;
    }
  }
  // Półjawny Euler: najpierw prędkość, potem położenie — stabilny dla ruchu balistycznego.
  v[0] += ax * dt; v[1] += ay * dt; v[2] += az * dt;
  const px = p[0], py = p[1], pz = p[2];
  p[0] += v[0] * dt; p[1] += v[1] * dt; p[2] += v[2] * dt;

  /*
   * Odbicie w dokładnym ułamku kroku: cofamy piłkę do punktu styku, odbijamy
   * prędkość i dopiero wtedy dokańczamy resztę kroku. Odbicie liczone na
   * granicy kroku przeskakiwało o całą milisekundę i wynik skakał o kilka
   * milimetrów przy minimalnej zmianie prędkości — solver nie mógł się zbiec.
   */
  const bounce = (frac: number, apply: () => void) => {
    const rest = (1 - frac) * dt;
    p[0] = px + (p[0] - px) * frac; p[1] = py + (p[1] - py) * frac; p[2] = pz + (p[2] - pz) * frac;
    apply();
    p[0] += v[0] * rest; p[1] += v[1] * rest; p[2] += v[2] * rest;
  };

  if (p[1] < 0 && v[1] < 0 && py >= 0) {
    bounce(py / (py - p[1]), () => {
      v[1] = -v[1] * ph.floorE;
      v[0] *= ph.floorFriction;
      v[2] *= ph.floorFriction;
    });
    onEvent?.('floor');
  }
  for (const w of ph.walls) {
    const a = w.axis;
    const before = a === 0 ? px : pz;
    if ((p[a] - w.at) * w.side > 0 && v[a] * w.side > 0 && (before - w.at) * w.side <= 0) {
      bounce((w.at - before) / (p[a] - before), () => {
        v[a] = -v[a] * w.e;
        v[a === 0 ? 2 : 0] *= w.friction;
        v[1] *= w.friction;
      });
      onEvent?.(w.kind);
    }
  }
}

/** Sam punkt końcowy — tani wariant dla solvera. */
function endPoint(start: V3, v0: V3, T: number, ph: Physics, stepDt = DT): { p: V3; kinds: string[] } {
  const p = [...start], v = [...v0];
  const kinds: string[] = [];
  const n = Math.max(1, Math.round(T / stepDt));
  const dt = T / n;
  for (let i = 0; i < n; i++) step(p, v, ph, dt, kind => kinds.push(kind));
  return { p: [p[0], p[1], p[2]], kinds };
}

export function simulate(start: V3, v0: V3, T: number, ph: Physics): Flight {
  const n = Math.max(1, Math.round(T / DT));
  const dt = T / n;
  const pos = new Float64Array((n + 1) * 3);
  const vel = new Float64Array((n + 1) * 3);
  const p = [...start], v = [...v0];
  const events: FlightEvent[] = [];
  let apex = start[1];
  pos.set(p, 0); vel.set(v, 0);
  for (let i = 1; i <= n; i++) {
    step(p, v, ph, dt, kind => events.push({ t: i * dt, kind, pos: [p[0], p[1], p[2]] }));
    pos.set(p, i * 3);
    vel.set(v, i * 3);
    if (p[1] > apex) apex = p[1];
  }
  return { start, v0, T, dt, pos, vel, events, apex };
}

function solve3(m: number[][], b: number[]): number[] | null {
  const [[a, bb, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - bb * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = [
    [(e * i - f * h), -(bb * i - c * h), (bb * f - c * e)],
    [-(d * i - f * g), (a * i - c * g), -(a * f - c * d)],
    [(d * h - e * g), -(a * h - bb * g), (a * e - bb * d)],
  ];
  return inv.map(row => (row[0] * b[0] + row[1] * b[1] + row[2] * b[2]) / det);
}

/**
 * Wstępne przeszukanie siatki prędkości (kierunek poziomy × kąt wzniesienia ×
 * szybkość) grubym krokiem. Newton sam nie przeskoczy z toru „świecy” na tor
 * z odbiciem od ściany — tu wybieramy najlepszy start z właściwym przebiegiem
 * odbić, a Newton go dopracowuje.
 */
function searchStart(start: V3, target: V3, T: number, ph: Physics, same: (k: string[]) => boolean): V3 | null {
  let best: V3 | null = null, bestErr = Infinity;
  for (let a = 0; a < 24; a++) {
    const az = (a / 24) * Math.PI * 2;
    for (let e = -4; e <= 14; e++) {
      const el = (e / 14) * (Math.PI * 0.42);
      for (let s = 2.5; s <= 35; s += 2.5) {
        const v: V3 = [Math.cos(az) * Math.cos(el) * s, Math.sin(el) * s, Math.sin(az) * Math.cos(el) * s];
        const res = endPoint(start, v, T, ph, SEARCH_DT);
        if (!same(res.kinds)) continue;
        const err = Math.hypot(res.p[0] - target[0], res.p[1] - target[1], res.p[2] - target[2]);
        if (err < bestErr) { bestErr = err; best = v; }
      }
    }
  }
  return best;
}

export interface SolveOptions {
  /** Oczekiwana kolejność zdarzeń (np. ['floor', 'glass']). Solver odrzuca kroki, które ją łamią. */
  expect?: readonly string[];
  /** Punkt startowy dla Newtona — przy odbiciach od ścian warto podać tor „rozłożony” w lustrze. */
  guess?: V3;
}

/**
 * Prędkość początkowa, przy której piłka po czasie `T` jest dokładnie w `target`
 * (z wszystkimi odbiciami po drodze). Metoda Newtona z jakobianem liczonym
 * numerycznie; krok jest tłumiony, a kroki zmieniające kolejność odbić są
 * odrzucane, więc solver nie „przeskakuje” na tor z innym przebiegiem.
 */
export function solveFlight(start: V3, target: V3, T: number, ph: Physics, opts: SolveOptions = {}): Flight {
  const same = (kinds: string[]) => !opts.expect
    || (kinds.length === opts.expect.length && kinds.every((k, i) => k === opts.expect![i]));
  let v: V3 = opts.guess ?? [
    (target[0] - start[0]) / T,
    (target[1] - start[1]) / T + 0.5 * ph.g * T,
    (target[2] - start[2]) / T,
  ];
  if (opts.expect && !same(endPoint(start, v, T, ph, SEARCH_DT).kinds)) {
    v = searchStart(start, target, T, ph, same) ?? v;
  }
  let cur = endPoint(start, v, T, ph);
  let err = cur.p.map((x, i) => x - target[i]);
  for (let it = 0; it < 60 && Math.hypot(err[0], err[1], err[2]) > 2e-4; it++) {
    const h = 1e-4;
    const J: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < 3; k++) {
      const dv: V3 = [...v];
      dv[k] += h;
      const pk = endPoint(start, dv, T, ph).p;
      for (let r = 0; r < 3; r++) J[r][k] = (pk[r] - cur.p[r]) / h;
    }
    const dx = solve3(J, err.map(x => -x));
    if (!dx) break;
    let scale = 1;
    let accepted = false;
    for (let tries = 0; tries < 8; tries++, scale *= 0.5) {
      const cand: V3 = [v[0] + dx[0] * scale, v[1] + dx[1] * scale, v[2] + dx[2] * scale];
      const res = endPoint(start, cand, T, ph);
      const e2 = res.p.map((x, i) => x - target[i]);
      if (Math.hypot(e2[0], e2[1], e2[2]) < Math.hypot(err[0], err[1], err[2]) && (same(res.kinds) || !same(cur.kinds))) {
        v = cand; cur = res; err = e2; accepted = true;
        break;
      }
    }
    if (!accepted) break;
  }
  return simulate(start, v, T, ph);
}

/* ── Wymiana ──────────────────────────────────────────────────────── */

export interface ShotSpec {
  /**
   * Punkt kontaktu z rakietą (m). Pominięty, gdy poprzednie uderzenie ma
   * `via` — wtedy kontakt jest tam, dokąd piłka faktycznie doleciała.
   */
  from?: V3;
  /** Czas lotu do następnego kontaktu (s). */
  T: number;
  expect?: readonly string[];
  guess?: V3;
  /**
   * Zaprojektowane trafienie w ścianę: piłka ma dolecieć do `at` po czasie
   * `t` (z odbiciami z `expect` po drodze), odbić się od ściany `wall`,
   * a dalej leci już swobodnie. Tak gra się w padlu — zawodnik czeka na
   * piłkę wychodzącą z szyby, a nie piłka trafia w zadany punkt.
   */
  via?: { at: V3; t: number; wall: string };
}

export interface Rally {
  flights: Flight[];
  /** Chwile kontaktów od początku cyklu (s). */
  contacts: number[];
  /** Położenie piłki w chwili każdego kontaktu (m). */
  starts: V3[];
  /** Długość cyklu (s). */
  cycle: number;
}

/** Sklejenie dwóch lotów (np. przed i po szybie) w jeden. */
function joinFlights(a: Flight, b: Flight, kind: string): Flight {
  const pos = new Float64Array(a.pos.length + b.pos.length - 3);
  const vel = new Float64Array(a.vel.length + b.vel.length - 3);
  pos.set(a.pos, 0); pos.set(b.pos.subarray(3), a.pos.length);
  vel.set(a.vel, 0); vel.set(b.vel.subarray(3), a.vel.length);
  return {
    start: a.start,
    v0: a.v0,
    T: a.T + b.T,
    dt: a.dt,
    pos,
    vel,
    events: [...a.events, { t: a.T, kind, pos: b.start }, ...b.events.map(e => ({ ...e, t: e.t + a.T }))],
    apex: Math.max(a.apex, b.apex),
  };
}

/** Zamknięta pętla uderzeń: ostatnie trafia w punkt pierwszego. */
export function buildRally(shots: readonly ShotSpec[], ph: Physics): Rally {
  const flights: Flight[] = [];
  const contacts: number[] = [];
  const starts: V3[] = [];
  let t = 0;
  let carried: V3 | null = null;
  shots.forEach((s, i) => {
    const start = s.from ?? carried;
    if (!start) throw new Error(`Uderzenie ${i} nie ma punktu startu`);
    contacts.push(t);
    starts.push(start);
    if (s.via) {
      const wall = ph.walls.find(w => w.kind === s.via!.wall);
      if (!wall) throw new Error(`Brak ściany ${s.via.wall}`);
      // Do ściany bez niej samej w fizyce — punkt na ścianie jest celem.
      const free = { ...ph, walls: ph.walls.filter(w => w !== wall) };
      const toWall = solveFlight(start, s.via.at, s.via.t, free, { expect: s.expect, guess: s.guess });
      const v = endVelocity(toWall);
      const a = wall.axis, o = a === 0 ? 2 : 0;
      const out: V3 = [...v];
      out[a] = -v[a] * wall.e;
      out[o] = v[o] * wall.friction;
      out[1] = v[1] * wall.friction;
      const rest = simulate(s.via.at, out, s.T - s.via.t, ph);
      const joined = joinFlights(toWall, rest, wall.kind);
      flights.push(joined);
      const n = joined.pos.length - 3;
      carried = [joined.pos[n], joined.pos[n + 1], joined.pos[n + 2]];
    } else {
      const next = shots[(i + 1) % shots.length];
      const target = next.from ?? null;
      if (!target) throw new Error(`Uderzenie ${i}: następne musi mieć punkt startu`);
      flights.push(solveFlight(start, target, s.T, ph, { expect: s.expect, guess: s.guess }));
      carried = null;
    }
    t += s.T;
  });
  return { flights, contacts, starts, cycle: t };
}

export interface RallySample {
  pos: V3;
  vel: V3;
  /** Który lot trwa. */
  shot: number;
  /** Czas od początku tego lotu (s). */
  local: number;
}

/** Stan piłki w chwili `t` cyklu (s), z interpolacją między próbkami. */
export function rallyAt(r: Rally, t: number): RallySample {
  const tt = ((t % r.cycle) + r.cycle) % r.cycle;
  let shot = r.flights.length - 1;
  for (let i = 0; i < r.contacts.length; i++) {
    const end = r.contacts[i] + r.flights[i].T;
    if (tt < end) { shot = i; break; }
  }
  const f = r.flights[shot];
  const local = Math.min(f.T, Math.max(0, tt - r.contacts[shot]));
  const x = local / f.dt;
  const i0 = Math.min(Math.floor(x), f.pos.length / 3 - 2);
  const k = x - i0;
  const lerp = (arr: Float64Array, c: number) => arr[i0 * 3 + c] * (1 - k) + arr[(i0 + 1) * 3 + c] * k;
  return {
    pos: [lerp(f.pos, 0), lerp(f.pos, 1), lerp(f.pos, 2)],
    vel: [lerp(f.vel, 0), lerp(f.vel, 1), lerp(f.vel, 2)],
    shot,
    local,
  };
}

/** Prędkość końcowa lotu — z nią piłka dolatuje do następnej rakiety. */
export function endVelocity(f: Flight): V3 {
  const i = f.vel.length - 3;
  return [f.vel[i], f.vel[i + 1], f.vel[i + 2]];
}

/** Wszystkie zdarzenia wymiany w czasie cyklu (s). */
export function rallyEvents(r: Rally): FlightEvent[] {
  return r.flights.flatMap((f, i) => f.events.map(e => ({ ...e, t: e.t + r.contacts[i] })));
}
