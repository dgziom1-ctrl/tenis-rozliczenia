// Charakteryzacja rysowania sprzętu areny (rakiety, piłka, cień, błysk, smuga).
//
// Zamiast obrazu zapisujemy dokładny dziennik wywołań kontekstu 2D (metody,
// argumenty, ustawienia stylu) dla kilku modeli, stanów i motywów. Dziennik to
// pełny opis tego, co trafia na płótno, więc rozbicie `drawRacket` na mniejsze
// funkcje da się sprawdzić bez oglądania pikseli: nic nie może się zmienić.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BADMINTON_MODEL, PADEL_MODEL, PINGPONG_MODEL, SQUASH_MODEL,
  drawBall, drawFlash, drawRacket, drawShadow, drawTrail,
} from '../components/layout/arena/gear';

/** Wartość w dzienniku: liczby zaokrąglone (szum IEEE-754), obiekty po nazwie. */
function fmt(value) {
  if (typeof value === 'number') return Number(value.toFixed(4));
  if (value && typeof value === 'object') return value.__name ?? '[object]';
  return value;
}

/** Atrapa kontekstu 2D: zapisuje wywołania i przypisania, gradienty i ścieżki też. */
function recorder() {
  const log = [];
  const state = {};
  let gradients = 0;
  const g = new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return (...args) => {
        log.push(`${String(prop)}(${args.map(fmt).join(', ')})`);
        if (prop === 'createRadialGradient') {
          const id = ++gradients;
          return {
            __name: `gradient${id}`,
            addColorStop: (offset, color) => log.push(`gradient${id}.addColorStop(${offset}, ${color})`),
          };
        }
        return undefined;
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      log.push(`${String(prop)} = ${fmt(value)}`);
      return true;
    },
  });
  return { g, log };
}

/** Paleta: każdy kolor to własna nazwa, więc w dzienniku widać, który token trafił gdzie. */
const P = new Proxy({}, { get: (_, key) => `#${String(key)}` });

/** Rzut z lekką perspektywą: skala zależy od głębi, żeby grubości szły za nią. */
const proj = (x, y, z) => [300 + x * 2 + z * 0.1, 200 - y * 1.5, 1 + z * 0.002];

const sprite = (name) => ({ __name: `sprite:${name}` });
const GLOWS = { ball: sprite('ball'), hit: sprite('hit'), idle: sprite('idle') };
const NO_GLOWS = { ball: null, hit: null, idle: null };

const context = (lightMode, glows = GLOWS) => ({ P, proj, lightMode, glows });

const POSE = { hand: [10, -20, 30], dir: [0.3, -0.9, 0.1], width: [0.9, 0.3, 0.2] };

const STATES = {
  idle: { hitting: false, impact: 0, charge: 0 },
  charged: { hitting: false, impact: 0, charge: 0.7 },
  hitting: { hitting: true, impact: 0.6 },
};

const SPECS = {
  pingpong: { model: PINGPONG_MODEL, headLen: 14, headWid: 14, shaft: 8, handle: 16, shaftWidth: 4, solid: true, faceInset: 0.95, rim: 0.55 },
  badminton: { model: BADMINTON_MODEL, headLen: 20, headWid: 15, shaft: 25, handle: 18, shaftWidth: 2.5, solid: false },
  squash: { model: SQUASH_MODEL, headLen: 18, headWid: 14, shaft: 22, handle: 16, shaftWidth: 2.5, solid: false },
  padel: { model: PADEL_MODEL, headLen: 24, headWid: 20, shaft: 6, handle: 14, shaftWidth: 3, solid: true },
};

/** Rysuje i zwraca dziennik wywołań jako tekst. */
function trace(draw) {
  const { g, log } = recorder();
  draw(g, log);
  return log.join('\n');
}

describe('gear — dziennik rysowania rakiety', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe.each(Object.entries(SPECS))('%s', (_name, spec) => {
    it.each(Object.entries(STATES))('motyw ciemny, stan %s', (_state, options) => {
      expect(trace(g => drawRacket(g, context(false), spec, POSE, options))).toMatchSnapshot();
    });

    it('motyw jasny, uderzenie', () => {
      expect(trace(g => drawRacket(g, context(true), spec, POSE, STATES.hitting))).toMatchSnapshot();
    });

    it('bez poświat nie rysuje halo', () => {
      const log = trace(g => drawRacket(g, context(false, NO_GLOWS), spec, POSE, STATES.idle));
      expect(log).not.toContain('drawImage');
      expect(log).toMatchSnapshot();
    });
  });

  it('padel: otworki jako jedna ścieżka Path2D, a bez niej jako łuki', () => {
    const calls = [];
    class FakePath2D {
      constructor() { this.__name = `path${calls.length}`; }
      moveTo(...args) { calls.push(`path.moveTo(${args.map(fmt).join(', ')})`); }
      arc(...args) { calls.push(`path.arc(${args.map(fmt).join(', ')})`); }
    }
    vi.stubGlobal('Path2D', FakePath2D);
    // Osobny obiekt modelu, bo ścieżka otworków jest pamiętana per model.
    const withPath = { ...PADEL_MODEL, holes: [...PADEL_MODEL.holes] };
    const logWithPath = trace(g => drawRacket(g, context(false), { ...SPECS.padel, model: withPath }, POSE, STATES.idle));
    expect(`${calls.join('\n')}\n${logWithPath}`).toMatchSnapshot();

    vi.unstubAllGlobals();
    const withoutPath = { ...PADEL_MODEL, holes: [...PADEL_MODEL.holes] };
    const logArcs = trace(g => drawRacket(g, context(false), { ...SPECS.padel, model: withoutPath }, POSE, STATES.idle));
    expect(logArcs).toContain('arc(');
    expect(logArcs).toMatchSnapshot();
  });
});

describe('gear — piłka, cień, błysk i smuga', () => {
  it.each([
    ['pasek, bez uderzenia', { radius: 6, impact: 0, spin: 0 }],
    ['pasek, obrót i uderzenie', { radius: 6, impact: 0.5, spin: 2.2 }],
    ['pasek, mocne uderzenie', { radius: 6, impact: 1, spin: 1 }],
    ['kropki squasha, bez uderzenia', { radius: 5, impact: 0, spin: 0.4, dots: true }],
    ['kropki squasha, obrót', { radius: 5, impact: 0.3, spin: 3.1, dots: true }],
    ['kropki squasha, kropka tuż za granicą widoczności', { radius: 5, impact: 0, spin: 1.82, dots: true }],
  ])('drawBall: %s', (_label, options) => {
    const { g, log } = recorder();
    const returned = drawBall(g, context(false), [12, -30, 40], options);
    expect(returned).toEqual(proj(12, -30, 40));
    expect(log.join('\n')).toMatchSnapshot();
  });

  it('drawBall bez poświaty piłki nie rysuje halo', () => {
    const { g, log } = recorder();
    drawBall(g, context(false, NO_GLOWS), [0, 0, 0], { radius: 6, impact: 0.4 });
    expect(log.join('\n')).not.toContain('drawImage');
  });

  it.each([
    ['nisko nad podłogą', [5, -3, 20]],
    ['wysoko', [5, -60, 20]],
    ['za wysoko — brak cienia', [5, -400, 20]],
  ])('drawShadow: %s', (_label, pos) => {
    const { g, log } = recorder();
    drawShadow(g, context(false), pos, 0, 6);
    expect(log.join('\n')).toMatchSnapshot();
  });

  it.each([
    ['w połowie błysku', 0.5],
    ['początek', 0.01],
    ['koniec poza zakresem', 1],
    ['przed startem', 0],
  ])('drawFlash: %s', (_label, k) => {
    for (const lightMode of [false, true]) {
      const { g, log } = recorder();
      drawFlash(g, context(lightMode), [3, -4, 15], k, 20);
      expect(log.join('\n')).toMatchSnapshot();
    }
  });

  it('drawFlash bez poświaty uderzenia nic nie rysuje', () => {
    const { g, log } = recorder();
    drawFlash(g, context(false, NO_GLOWS), [3, -4, 15], 0.5, 20);
    expect(log).toEqual([]);
  });

  it('drawTrail: smuga z kilku punktów bledne z wiekiem, a pusta lista nic nie rysuje', () => {
    const { g, log } = recorder();
    drawTrail(g, context(false), [[1, -2, 10], [3, -5, 14], [6, -9, 18]], 6, 0.8);
    expect(log.join('\n')).toMatchSnapshot();
    const empty = recorder();
    drawTrail(empty.g, context(false), [], 6);
    expect(empty.log).toEqual([]);
  });
});
