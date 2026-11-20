import { describe, it, expect } from 'vitest';
import { buildRally, rallyAt, simulate, solveFlight } from '../components/layout/arena/physics';
import { PINGPONG_RALLY } from '../components/layout/arena/pingpong';
import { PADEL_RALLY } from '../components/layout/arena/padel';
import { BADMINTON_RALLY } from '../components/layout/arena/badminton';
import { SQUASH_RALLY } from '../components/layout/arena/squash';

/**
 * Fizyka areny w nagłówku. Ruch piłki ma wynikać z równań ruchu, nie
 * z ręcznie układanych krzywych — te testy pilnują, że wymiany się
 * domykają (piłka trafia dokładnie w następną rakietę), odbicia są tam,
 * gdzie powinny, a piłka mija narysowaną siatkę i trafia w ścianę
 * w dozwolonym miejscu.
 */

const RALLIES = {
  pingpong: PINGPONG_RALLY,
  padel: PADEL_RALLY,
  badminton: BADMINTON_RALLY,
  squash: SQUASH_RALLY,
};

const endOf = (f) => {
  const n = f.pos.length - 3;
  return [f.pos[n], f.pos[n + 1], f.pos[n + 2]];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Wysokość piłki w chwili przejścia nad płaszczyzną x = 0 (siatka). */
function heightOverNet(f) {
  for (let i = 3; i < f.pos.length; i += 3) {
    if (Math.sign(f.pos[i - 3]) !== Math.sign(f.pos[i])) return f.pos[i + 1];
  }
  return null;
}

describe('solver lotu', () => {
  it('bez oporu i rotacji zgadza się z rzutem ukośnym', () => {
    const ph = { g: 9.81, vt: Infinity, magnus: 0, floorE: 0.8, floorFriction: 1, walls: [] };
    const f = simulate([0, 1, 0], [3, 4, 0], 0.6, ph);
    const [x, y] = endOf(f);
    expect(x).toBeCloseTo(1.8, 3);
    expect(y).toBeCloseTo(1 + 4 * 0.6 - 0.5 * 9.81 * 0.36, 2);
  });

  it('odbija piłkę od podłogi ze współczynnikiem sprężystości', () => {
    const ph = { g: 9.81, vt: Infinity, magnus: 0, floorE: 0.5, floorFriction: 1, walls: [] };
    // Spadek z 1 m trwa 0,45 s; drugi kozioł byłby po ok. 0,9 s.
    const f = simulate([0, 1, 0], [0, 0, 0], 0.85, ph);
    expect(f.events).toHaveLength(1);
    expect(f.events[0].t).toBeCloseTo(Math.sqrt(2 / 9.81), 2);
    // Po odbiciu z połową prędkości piłka wznosi się na ćwierć wysokości.
    let apexAfter = 0;
    for (let i = Math.ceil(f.events[0].t / f.dt) * 3; i < f.pos.length; i += 3) apexAfter = Math.max(apexAfter, f.pos[i + 1]);
    expect(apexAfter).toBeCloseTo(0.25, 1);
  });

  it('trafia w zadany punkt w zadanym czasie, także z oporem powietrza', () => {
    const ph = { g: 9.81, vt: 8.4, magnus: 1.4, floorE: 0.86, floorFriction: 0.93, walls: [] };
    const f = solveFlight([-1.5, 0.3, 0], [1.5, 0.3, 0], 0.55, ph, { expect: ['floor'] });
    expect(dist(endOf(f), [1.5, 0.3, 0])).toBeLessThan(1e-3);
    expect(f.events.map(e => e.kind)).toEqual(['floor']);
  });
});

describe.each(Object.entries(RALLIES))('wymiana: %s', (name, cfg) => {
  const rally = buildRally(cfg.shots, cfg.physics);

  it('domyka się — każde uderzenie trafia dokładnie w następną rakietę', () => {
    rally.flights.forEach((f, i) => {
      const next = rally.starts[(i + 1) % rally.starts.length];
      expect(dist(endOf(f), next)).toBeLessThan(5e-3);
    });
  });

  it('ma odbicia w oczekiwanej kolejności', () => {
    rally.flights.forEach((f, i) => {
      const shot = cfg.shots[i];
      const expected = [...(shot.expect ?? []), ...(shot.via ? [shot.via.wall] : [])];
      expect(f.events.map(e => e.kind)).toEqual(expected);
    });
  });

  it('chwile kontaktów zgadzają się z rytmem sceny', () => {
    expect(rally.contacts[0]).toBe(0);
    expect(rally.cycle).toBeCloseTo(cfg.shots.reduce((s, x) => s + x.T, 0), 6);
    // Piłka w chwili kontaktu jest w punkcie startu uderzenia.
    rally.contacts.forEach((t, i) => {
      expect(dist(rallyAt(rally, t + 1e-6).pos, rally.starts[i])).toBeLessThan(0.02);
    });
  });

  it('w lotach nie przekracza realistycznych prędkości tej dyscypliny', () => {
    const limit = { pingpong: 12, padel: 25, badminton: 45, squash: 30 }[name];
    for (const f of rally.flights) expect(Math.hypot(...f.v0)).toBeLessThan(limit);
  });
});

describe('dyscypliny — szczegóły fizyki', () => {
  it('ping-pong: piłka mija narysowaną siatkę i odbija się na połowie rywala', () => {
    const r = buildRally(PINGPONG_RALLY.shots, PINGPONG_RALLY.physics);
    r.flights.forEach((f, i) => {
      // Narysowana siatka ma 19 jednostek ≈ 0,245 m; wysokość w fizyce to spód piłki.
      expect(heightOverNet(f)).toBeGreaterThan(0.245);
      const bounce = f.events[0].pos[0];
      const towards = Math.sign(r.starts[(i + 1) % 2][0]);
      expect(Math.sign(bounce)).toBe(towards);
      expect(Math.abs(bounce)).toBeLessThan(1.37);
    });
  });

  it('padel: pierwsza piłka wchodzi w tylną szybę po odbiciu od kortu', () => {
    const r = buildRally(PADEL_RALLY.shots, PADEL_RALLY.physics);
    const [floor, glass] = r.flights[0].events;
    expect(floor.kind).toBe('floor');
    expect(glass.kind).toBe('glass');
    expect(floor.pos[0]).toBeGreaterThan(0);
    expect(glass.t).toBeGreaterThan(floor.t);
    r.flights.forEach(f => expect(heightOverNet(f)).toBeGreaterThan(0.97));
  });

  it('badminton: lotka leci nad siatką i gwałtownie hamuje', () => {
    const r = buildRally(BADMINTON_RALLY.shots, BADMINTON_RALLY.physics);
    r.flights.forEach(f => {
      expect(heightOverNet(f)).toBeGreaterThan(2);
      const n = f.vel.length - 3;
      const vEnd = Math.hypot(f.vel[n], f.vel[n + 1], f.vel[n + 2]);
      // Opór piór: z ok. 40 m/s zostaje mniej niż prędkość graniczna.
      expect(vEnd).toBeLessThan(Math.hypot(...f.v0) / 4);
    });
  });

  it('squash: piłka trafia w ścianę czołową nad pasem tin i pod linią autu', () => {
    const r = buildRally(SQUASH_RALLY.shots, SQUASH_RALLY.physics);
    r.flights.forEach(f => {
      const front = f.events.find(e => e.kind === 'front');
      expect(front.pos[1]).toBeGreaterThan(0.48);
      expect(front.pos[1]).toBeLessThan(4.57);
      // Martwa piłka: po koźle podnosi się nisko.
      const floor = f.events.find(e => e.kind === 'floor');
      let after = 0;
      for (let i = Math.ceil(floor.t / f.dt) * 3; i < f.pos.length; i += 3) after = Math.max(after, f.pos[i + 1]);
      expect(after).toBeLessThan(0.5);
    });
  });
});
