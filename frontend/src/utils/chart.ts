/**
 * Wspólna geometria wykresów SVG.
 *
 * `AttendanceTrendChart` i `RankingHistoryChart` miały znak w znak identyczny
 * reduktor `linePath`, ale rozjeżdżały się na wszystkim widocznym: wysokość
 * 140 vs 200, prawy margines 46 vs 16 (więc obszary rysowania nie pokrywały się
 * mimo tej samej szerokości renderowanej), krok kreskowania 3/3 vs 4/4.
 */

/** Punkt na płótnie: [x, y]. Wykresy trzymają też dodatkowe pola, stąd reszta. */
export type ChartPoint = readonly [number, number, ...number[]];

/** Szerokość viewBoxa — wspólna, żeby oba wykresy skalowały się identycznie. */
export const CHART_WIDTH = 560;

/** Rozmiar tekstu w viewBoxie. Wykresy mierzą szerokość kontenera, więc
 *  viewBox jest w pikselach CSS i 12 px zostaje 12 px także na telefonie. */
export const CHART_LABEL_SIZE = 12;

/** Wzór kreskowania linii pomocniczych. */
export const CHART_GRID_DASH = '4 4';

/**
 * Ścieżka wygładzona krzywymi sześciennymi, z punktem kontrolnym w połowie
 * odcinka — daje łagodne przejścia bez wyskoków poza zakres danych.
 */
export function linePath(pts: readonly ChartPoint[]): string {
  return pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const prev = pts[i - 1];
    const cpx = (prev[0] + x) / 2;
    return `${acc} C${cpx},${prev[1]} ${cpx},${y} ${x},${y}`;
  }, '');
}

/**
 * Co która etykieta osi ma się pokazać, żeby podpisy nie nachodziły.
 * `Math.floor` dawał krok 1 dla n = 7 przy limicie 6, czyli wszystkie naraz.
 */
export function labelStep(count: number, maxLabels = 6): number {
  return Math.max(1, Math.ceil(count / maxLabels));
}
