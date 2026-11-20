import type { ArenaScene, ArenaSceneFactory, SceneContext, Vec3 } from './types';
import { W, H } from './kit';
import { buildRally, endVelocity, rallyAt, rallyEvents, type Physics, type Rally, type ShotSpec, type V3 } from './physics';
import { buildSwing, type StrokeStyle, type Swing } from './motion';
import { drawFlash, drawRacket, drawShadow, drawTrail, type RacketSpec } from './gear';

/*
 * Wspólny szkielet scen z fizyką: wymiana liczona w metrach (physics.ts),
 * mapowana na układ rysowania sceny, dwóch graczy z rakietami prowadzonymi
 * z dłoni (motion.ts) i piłka z cieniem, smugą i błyskami odbić.
 * Sceny dostarczają boisko, parametry fizyczne, uderzenia i styl zamachu.
 */

/** Metry → jednostki sceny. Wysokość rośnie w górę, a w świecie y rośnie w dół. */
export interface MeterMap {
  sx: number; sy: number; sz: number;
  ox: number; oy: number; oz: number;
}

export interface PlayerSetup {
  /** Indeksy uderzeń (w `shots`), które wykonuje ten gracz. */
  shots: readonly number[];
  racket: RacketSpec;
  style: StrokeStyle;
}

export interface BallState {
  /** Czas rzeczywisty w cyklu (s). */
  t: number;
  /** Środek piłki w świecie. */
  pos: Vec3;
  /** Prędkość w świecie (jednostki/s). */
  vel: Vec3;
  /** Prędkość w m/s — do decyzji zależnych od fizyki (np. smuga). */
  speed: number;
  /** Czas od ostatniego kontaktu z rakietą (s) i kierunek lotu przed nim. */
  sinceHit: number;
  vBeforeHit: Vec3;
}

export interface RallySceneConfig {
  physics: Physics;
  shots: readonly ShotSpec[];
  map: MeterMap;
  /** Promień rysowanej piłki (jednostki). */
  ballR: number;
  /** Zwolnienie: 1 = czas rzeczywisty, 0,7 = 70% prędkości (powtórka). */
  slowmo: number;
  players: readonly [PlayerSetup, PlayerSetup];
  staticProgress: number;
  paintStatic(sg: CanvasRenderingContext2D, ctx: SceneContext): void;
  /** Błyski przy zdarzeniach fizyki: rodzaj → rozmiar (jednostki) i czas (s). */
  flashes?: Readonly<Record<string, { size: number; dur: number }>>;
  /** Smuga: liczba kopii i odstęp (s czasu rzeczywistego). */
  trail?: { count: number; spacing: number };
  /** Własne rysowanie piłki (lotka). Domyślnie kula z kit/gear. */
  drawBall(g: CanvasRenderingContext2D, ctx: SceneContext, ball: BallState, impact: number): void;
  /** Elementy pod piłką i rakietami (np. błysk szyby, odbicie w szkle). */
  drawUnder?(g: CanvasRenderingContext2D, ctx: SceneContext, ball: BallState): void;
}

interface Built {
  rally: Rally;
  swings: Swing[];
  hits: number[];
  toWorld: (p: V3) => Vec3;
  dirToWorld: (v: V3) => Vec3;
}

function build(cfg: RallySceneConfig): Built {
  const { map } = cfg;
  const rally = buildRally(cfg.shots, cfg.physics);
  const ballLift = cfg.ballR; // fizyczna wysokość to spód piłki — środek jest o promień wyżej
  const toWorld = (p: V3): Vec3 => [p[0] * map.sx + map.ox, map.oy - p[1] * map.sy - ballLift, p[2] * map.sz + map.oz];
  const dirToWorld = (v: V3): Vec3 => [v[0] * map.sx, -v[1] * map.sy, v[2] * map.sz];
  const n = cfg.shots.length;
  const swings = cfg.players.map(pl => buildSwing(
    pl.shots.map(i => ({
      t: rally.contacts[i],
      ball: toWorld(rally.starts[i]),
      vIn: dirToWorld(endVelocity(rally.flights[(i - 1 + n) % n])),
      vOut: dirToWorld(rally.flights[i].v0),
    })),
    rally.cycle,
    pl.style,
    { reach: pl.racket.shaft + pl.racket.headLen, ballR: cfg.ballR },
  ));
  return { rally, swings, hits: rally.contacts.map(c => c / rally.cycle), toWorld, dirToWorld };
}

/**
 * Fabryka sceny. Wymiana jest liczona raz (przy pierwszym użyciu sceny)
 * i współdzielona między instancjami — solver nie biegnie przy każdym
 * przełączeniu ani w pętli.
 */
export function createRallyScene(cfg: RallySceneConfig): ArenaSceneFactory {
  let built: Built | null = null;
  const get = () => (built ??= build(cfg));

  return (): ArenaScene => {
    const b = get();
    const { rally } = b;
    const events = rallyEvents(rally);
    const cycleMs = (rally.cycle * 1000) / cfg.slowmo;

    const ballAt = (t: number): BallState => {
      const s = rallyAt(rally, t);
      const pos = b.toWorld(s.pos);
      const vel = b.dirToWorld(s.vel);
      const before = endVelocity(rally.flights[(s.shot - 1 + rally.flights.length) % rally.flights.length]);
      return {
        t, pos, vel,
        speed: Math.hypot(s.vel[0], s.vel[1], s.vel[2]),
        sinceHit: s.local,
        vBeforeHit: b.dirToWorld(before),
      };
    };

    return {
      cycleMs,
      hits: b.hits,
      staticProgress: cfg.staticProgress,
      paintStatic(sg, ctx) {
        sg.clearRect(0, 0, W, H);
        cfg.paintStatic(sg, ctx);
      },
      draw(g, { progress, impact }, ctx) {
        const t = progress * rally.cycle;
        const ball = ballAt(t);

        /* Błyski odbić — na powierzchni, w miejscu i chwili zdarzenia z fizyki. */
        if (cfg.flashes) {
          for (const e of events) {
            const fx = cfg.flashes[e.kind];
            if (!fx) continue;
            const age = ((t - e.t) % rally.cycle + rally.cycle) % rally.cycle;
            if (age < fx.dur) {
              const at = b.toWorld(e.pos);
              if (e.kind === 'floor') at[1] += cfg.ballR; // na podłodze, nie w środku piłki
              drawFlash(g, ctx, at, age / fx.dur, fx.size);
            }
          }
        }
        cfg.drawUnder?.(g, ctx, ball);

        drawShadow(g, ctx, ball.pos, cfg.map.oy, cfg.ballR, 26 * cfg.map.sy / 10);

        /* Rakiety i piłka w kolejności głębokości — bliższe rysujemy na końcu. */
        const items: { depth: number; paint: () => void }[] = cfg.players.map((pl, i) => {
          const sw = b.swings[i];
          const pose = sw.pose(t);
          const head = pose.hand.map((v, k) => v + pose.dir[k] * (pl.racket.shaft + pl.racket.headLen)) as Vec3;
          return {
            depth: ctx.proj(head[0], head[1], head[2])[2],
            paint: () => drawRacket(g, ctx, pl.racket, pose, {
              hitting: sw.hitting(t),
              impact,
              charge: sw.charge(t) * 0.5,
            }),
          };
        });
        items.push({
          // Piłka w kontakcie zawsze nad rakietą — inaczej znikała w twarzy rakiety.
          depth: ctx.proj(ball.pos[0], ball.pos[1], ball.pos[2])[2] + (ball.sinceHit < 0.03 ? 1 : 0),
          paint: () => {
            if (cfg.trail) {
              const pts: Vec3[] = [];
              for (let i = 1; i <= cfg.trail.count; i++) pts.push(ballAt(t - i * cfg.trail.spacing).pos);
              drawTrail(g, ctx, pts, cfg.ballR, Math.min(1, ball.speed / 12));
            }
            cfg.drawBall(g, ctx, ball, impact);
          },
        });
        items.sort((a, c) => a.depth - c.depth).forEach(it => it.paint());
      },
    };
  };
}
