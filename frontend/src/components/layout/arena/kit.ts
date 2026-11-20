import type { ArenaPalette, Projected, ScreenPoint } from './types';

/** Logiczny układ współrzędnych areny. Bufor canvasu jest do niego skalowany. */
export const W = 560;
export const H = 180;

/**
 * Jedna kamera dla wszystkich dyscyplin. Gdyby każda scena miała własny kąt,
 * przełączanie wyglądałoby jak zmiana programu w telewizorze, a nie ta sama
 * arena z innym kortem.
 */
const CX = 265, CY = 90;
const RX = 0.471, RY = -0.349;
const FOV = 370, DIST = 290;
const cX = Math.cos(RX), sX = Math.sin(RX);
const cY = Math.cos(RY), sY = Math.sin(RY);

export function createProjection(): (x: number, y: number, z: number) => Projected {
  return (x, y, z) => {
    const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
    const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
    const s = FOV / (z2 + DIST);
    return [CX + x1 * s, CY + y2 * s, s];
  };
}

/**
 * Canvas 2D nie rozumie `var()`. Zamiast wpisywać kolory w scenach, czytamy
 * tokeny zrealizowane w `:root` / `body.theme-light`. Fallbacki są tylko dla
 * środowisk bez `getComputedStyle` (jsdom, stare webview).
 */
export function readPalette(): ArenaPalette {
  const styles = typeof getComputedStyle === 'function' ? getComputedStyle(document.body) : null;
  const token = (name: string, fallback: string) =>
    styles?.getPropertyValue(name).trim() || fallback;
  return {
    accent:          token('--canvas-accent', '0,229,255'),
    accentDeep:      token('--canvas-accent-deep', '0,140,220'),
    grid:            token('--canvas-grid', '0,180,255'),
    edge:            token('--canvas-edge', '0,200,255'),
    deepShade:       token('--canvas-deep-shade', '0,100,200'),
    tableFrom:       token('--canvas-table-from', '#020810'),
    tableTo:         token('--canvas-table-to', '#041828'),
    bodyFrom:        token('--canvas-body-from', '#062038'),
    bodyMid:         token('--canvas-body-mid', '#031428'),
    bodyTo:          token('--canvas-body-to', '#010C1C'),
    ballCore:        token('--canvas-ball-core', '#ffffff'),
    ballMid:         token('--canvas-ball-mid', '#d8f5ff'),
    ballEdge:        token('--canvas-ball-edge', '#80c8e0'),
    shadow:          token('--canvas-shadow', '0,50,120'),
    floorWash:       token('--canvas-floor-wash', '0,200,255'),
    iceStripe:       token('--canvas-ice-stripe', '0,220,255'),
    handle:          token('--canvas-handle', '2,12,28'),
    handleLine:      token('--canvas-handle-line', '0,80,140'),
    netTop:          token('--canvas-net-top', '200,248,255'),
    glow:            token('--canvas-glow', '0,160,255'),
    glowIdle:        token('--canvas-glow-idle', '0,180,255'),
    rubberHit:       token('--canvas-rubber-hit', '0,229,255'),
    rubberIdle:      token('--canvas-rubber-idle', '0,180,220'),
    rubberHitEnd:    token('--canvas-rubber-hit-end', '0,160,210'),
    rubberIdleEnd:   token('--canvas-rubber-idle-end', '0,120,180'),
    white:           token('--canvas-white', '255,255,255'),
  };
}

export const rgba = (rgb: string, alpha: number) => `rgba(${rgb},${alpha})`;

/** Mały, niezależny od DOM-u canvas na sprite. `null`, gdy brak kontekstu 2D. */
export function cacheSprite(
  width: number,
  height: number,
  paint: (c: CanvasRenderingContext2D, width: number, height: number) => void,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const sprite = document.createElement('canvas');
  sprite.width = Math.max(1, Math.round(width));
  sprite.height = Math.max(1, Math.round(height));
  const c = sprite.getContext('2d');
  if (!c) return null;
  paint(c, sprite.width, sprite.height);
  return sprite;
}

/**
 * Poświaty powstawały kiedyś przez `shadowBlur` — na iOS to najdroższa
 * operacja canvasu 2D, bo rozmycie liczone jest co klatkę. Rysujemy je
 * raz do małego sprite'a, a w pętli tylko skalujemy `drawImage`.
 */
export function makeGlow(rgb: string, strength: number): HTMLCanvasElement | null {
  return cacheSprite(96, 96, (c, size) => {
    const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, rgba(rgb, strength));
    grad.addColorStop(0.42, rgba(rgb, strength * 0.38));
    grad.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
  });
}

/** Rysuje sprite poświaty wyśrodkowany w punkcie, o promieniu `r`. */
export function drawGlow(
  g: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement | null,
  x: number, y: number, r: number, alpha: number,
) {
  if (!sprite || r <= 0 || alpha <= 0) return;
  g.save();
  g.globalAlpha = Math.min(1, alpha);
  g.drawImage(sprite, x - r, y - r, r * 2, r * 2);
  g.restore();
}

/** Ścieżka elipsy (bez wypełnienia) — obrócona i spłaszczona. */
export function ellipse(
  g: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number, rot?: number,
) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot || 0);
  g.scale(1, ry / Math.max(rx, 0.1));
  g.beginPath(); g.arc(0, 0, Math.max(rx, 0.1), 0, Math.PI * 2);
  g.restore();
}

export function quad(g: CanvasRenderingContext2D, pts: ScreenPoint[], fill: string | CanvasGradient) {
  g.beginPath();
  pts.forEach(([sx, sy], i) => (i ? g.lineTo(sx, sy) : g.moveTo(sx, sy)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

export function seg(
  g: CanvasRenderingContext2D,
  [ax, ay]: ScreenPoint, [bx, by]: ScreenPoint, col: string, w: number,
) {
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
}

/* ── Krzywe czasu ─────────────────────────────────────────────────── */

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** Gładkie przejście 0→1 między `a` i `b`. */
export const band = (a: number, b: number, t: number) => smoothstep(clamp01((t - a) / (b - a)));

/** Deterministyczny „szum” 0–1 — ten sam dla tych samych argumentów. */
export function hash01(a: number, b = 0): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
