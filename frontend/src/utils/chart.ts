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
 * Indeksy etykiet osi X: równy krok plus ostatnia sesja jako punkt odniesienia.
 *
 * Sam warunek `i % krok === 0 || i === n - 1` dokładał ostatni podpis obok
 * przedostatniego, gdy wypadał tuż za nim — na 390 px „6 paź” i „20 paź”
 * nachodziły na siebie. Gdy ostatni punkt jest bliżej niż `minGapPx` od
 * poprzedniej etykiety, zastępuje ją zamiast dokładać drugą w tym samym miejscu.
 */
export function spacedLabelIndices(count: number, width: number, minGapPx = 58): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];

  const last = count - 1;
  const gap = width / last;
  const maxLabels = Math.max(2, Math.floor(width / minGapPx) + 1);
  const step = Math.max(1, Math.ceil(last / (maxLabels - 1)));

  const indices: number[] = [];
  for (let i = 0; i < last; i += step) indices.push(i);

  const previous = indices[indices.length - 1];
  if ((last - previous) * gap >= minGapPx) indices.push(last);
  else indices[indices.length - 1] = last;

  return indices;
}
