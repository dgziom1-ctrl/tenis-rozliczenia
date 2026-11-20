import type { ArenaPalette } from './types';
import { H, W, band, clamp01, easeInOutCubic, hash01, rgba } from './kit';

/*
 * Przejście między dyscyplinami — „glitch swap”.
 *
 * Stara scena zamarza w ostatniej klatce i rozpada się na poziome pasy
 * przesuwane szarpnięciami, a nowa „materializuje się” za pionową linią
 * skanu. Wszystko dzieje się w tym samym canvasie, nad świeżo narysowaną
 * nową sceną — więc nie ma mrugnięcia pustką ani drugiego elementu w DOM.
 */

export const GLITCH_MS = 360;
/** Crossfade dla `prefers-reduced-motion`: bez szarpnięć, tylko przenikanie. */
export const FADE_MS = 240;

/** Ile pasów ma rozbita klatka. Nierówne wysokości wyglądają mniej „siatkowo”. */
const SLICES = 11;

interface SliceBounds { y: number; h: number }

const sliceBounds: SliceBounds[] = (() => {
  const weights = Array.from({ length: SLICES }, (_, i) => 0.5 + hash01(i, 3));
  const total = weights.reduce((a, b) => a + b, 0);
  let y = 0;
  return weights.map(w => {
    const h = (w / total) * H;
    const s = { y, h };
    y += h;
    return s;
  });
})();

/** Rysuje fragment zrzutu (w pikselach bufora) w logicznym układzie areny. */
function drawSnapSlice(
  g: CanvasRenderingContext2D, snap: HTMLCanvasElement,
  y: number, h: number, dx: number,
) {
  const ky = snap.height / H;
  g.drawImage(snap, 0, y * ky, snap.width, Math.max(1, h * ky), dx, y, W, h);
}

/**
 * Nakłada przejście na już narysowaną klatkę nowej sceny.
 * `t` biegnie od 0 do 1 przez `GLITCH_MS`.
 */
export function drawGlitchSwap(
  g: CanvasRenderingContext2D,
  snap: HTMLCanvasElement,
  t: number,
  P: ArenaPalette,
  lightMode: boolean,
  scanGlow: HTMLCanvasElement | null,
) {
  const sweep = easeInOutCubic(clamp01((t - 0.08) / 0.92));
  const scanX = -16 + (W + 32) * sweep;

  /* Szarpnięcia są skwantowane w czasie — płynny dryf czytałby się jako
     przesuwanie obrazka, a nie usterka sygnału. */
  const step = Math.floor(t * 14);
  const amp = 2 + 34 * Math.pow(t, 1.3);
  const fadeOld = 1 - band(0.62, 1, t) * 0.55;

  /* Prawa strona linii skanu: stara klatka, rozbita na pasy. */
  g.save();
  g.beginPath();
  g.rect(scanX, 0, W - scanX + 2, H);
  g.clip();
  g.clearRect(scanX, 0, W - scanX + 2, H);
  g.globalAlpha = fadeOld;
  for (let i = 0; i < SLICES; i++) {
    const { y, h } = sliceBounds[i];
    const jitter = hash01(i, step) - 0.5;
    // Tylko część pasów szarpie w danej chwili — reszta stoi, co daje
    // charakterystyczne „rwanie” zamiast falowania całego obrazu.
    const active = hash01(i + 17, step) > 0.45;
    const dx = active ? jitter * 2 * amp : 0;
    drawSnapSlice(g, snap, y, h, dx);
  }
  /* Rozszczepienie kanałów: dwie przesunięte kopie aktywnych pasów. */
  g.globalCompositeOperation = lightMode ? 'multiply' : 'lighter';
  g.globalAlpha = (lightMode ? 0.10 : 0.22) * (1 - t * 0.6);
  for (let i = 0; i < SLICES; i += 2) {
    const { y, h } = sliceBounds[i];
    const split = 2 + amp * 0.18;
    drawSnapSlice(g, snap, y, h, split);
    drawSnapSlice(g, snap, y, h, -split);
  }
  g.restore();

  /* Linie rastra nad całą areną — gasną razem z przejściem. */
  const rasterA = (lightMode ? 0.05 : 0.07) * (1 - t);
  if (rasterA > 0.004) {
    g.fillStyle = rgba(P.accent, rasterA);
    for (let y = 1; y < H; y += 3) g.fillRect(0, y, W, 0.8);
  }

  /* Świeżo odsłonięty pas nowej sceny lekko podświetlony za linią skanu. */
  if (scanX > 0 && scanX < W) {
    const trail = g.createLinearGradient(scanX - 34, 0, scanX, 0);
    trail.addColorStop(0, rgba(P.accent, 0));
    trail.addColorStop(1, rgba(P.accent, lightMode ? 0.10 : 0.16));
    g.fillStyle = trail;
    g.fillRect(scanX - 34, 0, 34, H);

    /* Linia skanu: rdzeń, poświata i drobne iskry na wysokości aktywnych pasów. */
    if (scanGlow) {
      g.save();
      g.globalAlpha = lightMode ? 0.45 : 0.75;
      g.drawImage(scanGlow, scanX - 14, -H * 0.2, 28, H * 1.4);
      g.restore();
    }
    g.fillStyle = rgba(lightMode ? P.accent : P.netTop, 0.95);
    g.fillRect(scanX - 0.75, 0, 1.5, H);
    for (let i = 0; i < SLICES; i += 3) {
      if (hash01(i + 5, step) < 0.5) continue;
      const { y, h } = sliceBounds[i];
      const len = 6 + 14 * hash01(i, step + 1);
      g.fillStyle = rgba(P.accent, 0.55);
      g.fillRect(scanX - len, y + h / 2, len, 1);
    }
  }
}

/** Przenikanie dla trybu bez ruchu: stara klatka gaśnie nad nową. */
export function drawCrossfade(g: CanvasRenderingContext2D, snap: HTMLCanvasElement, t: number) {
  const alpha = 1 - clamp01(t);
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(snap, 0, 0, W, H);
  g.restore();
}
