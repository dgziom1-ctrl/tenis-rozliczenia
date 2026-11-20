/** Punkt po rzucie perspektywicznym: [x ekranu, y ekranu, skala]. */
export type Projected = [number, number, number];

/** Funkcje rysujące czytają wyłącznie X i Y, więc przyjmują też punkty rzutowane. */
export type ScreenPoint = readonly [number, number, ...number[]];

/** Punkt w świecie areny: x wzdłuż kortu, y w pionie (ujemne w górę), z w głąb. */
export type Vec3 = [number, number, number];

/**
 * Kolory areny przeczytane z tokenów `--canvas-*`. Wartości RGB są bez `rgb()`,
 * żeby w pętli składać `rgba(...)` z własnym alpha; gradienty blatu i rakiet
 * to pełne kolory CSS.
 */
export interface ArenaPalette {
  accent: string;
  accentDeep: string;
  grid: string;
  edge: string;
  deepShade: string;
  tableFrom: string;
  tableTo: string;
  bodyFrom: string;
  bodyMid: string;
  bodyTo: string;
  ballCore: string;
  ballMid: string;
  ballEdge: string;
  shadow: string;
  floorWash: string;
  iceStripe: string;
  handle: string;
  handleLine: string;
  netTop: string;
  glow: string;
  glowIdle: string;
  rubberHit: string;
  rubberIdle: string;
  rubberHitEnd: string;
  rubberIdleEnd: string;
  white: string;
}

/** Poświaty malowane raz do sprite'ów — w pętli tylko się je skaluje. */
export interface ArenaGlows {
  ball: HTMLCanvasElement | null;
  hit: HTMLCanvasElement | null;
  idle: HTMLCanvasElement | null;
}

/** Wszystko, czego scena potrzebuje, żeby się narysować w bieżącym motywie. */
export interface SceneContext {
  P: ArenaPalette;
  proj: (x: number, y: number, z: number) => Projected;
  lightMode: boolean;
  glows: ArenaGlows;
}

export interface SceneFrame {
  /** Pozycja w cyklu 0–1. Uderzenia wypadają przy 0 (lewy gracz) i 0,5 (prawy). */
  progress: number;
  /** Znacznik czasu klatki (ms) — do efektów, które nie zależą od cyklu. */
  now: number;
  /** Siła ostatniego uderzenia 0–1, gaśnie w ~220 ms. */
  impact: number;
}

/**
 * Jedna dyscyplina na arenie. Silnik (`ArenaCanvas`) prowadzi pętlę, rytm
 * uderzeń, wstrząs i przejścia — scena tylko maluje.
 *
 * Wspólny kontrakt rytmu: dwa uderzenia na cykl, przy `progress` 0 i 0,5.
 * Dzięki temu błysk tytułu i puls podium działają tak samo w każdym sporcie.
 */
export interface ArenaScene {
  /** Długość pełnej wymiany (tam i z powrotem) w ms. */
  readonly cycleMs: number;
  /**
   * Chwile kontaktów rakiety z piłką jako ułamki cyklu. Domyślnie [0, 0,5];
   * sceny z fizyką podają rzeczywiste chwile (uderzenia nie muszą dzielić
   * cyklu równo na pół).
   */
  readonly hits?: readonly number[];
  /** Najładniejsza klatka do trybu bez ruchu — z dala od uderzeń. */
  readonly staticProgress: number;
  /** Wywoływane po zmianie motywu: tu scena buduje własne sprite'y. */
  prepare?(ctx: SceneContext): void;
  /** Nieruchoma część sceny — malowana raz na rozmiar i motyw. */
  paintStatic(sg: CanvasRenderingContext2D, ctx: SceneContext): void;
  /** Ruchoma część sceny — co klatkę, nad warstwą statyczną. */
  draw(g: CanvasRenderingContext2D, frame: SceneFrame, ctx: SceneContext): void;
}

/** Fabryka zamiast obiektu: scena może trzymać stan (np. obrót piłki). */
export type ArenaSceneFactory = () => ArenaScene;
