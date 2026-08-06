// Bazowe helpery kosztowe współdzielone przez sessionCost.ts i debt.ts.
// Wydzielone do osobnego modułu, aby uniknąć cyklicznego importu między nimi.
//
// ZASADA: każdy podział kwoty liczymy na CAŁKOWITYCH groszach, nigdy na floatach
// złotówkowych. Dzięki temu suma udziałów jest zawsze dokładnie równa kwocie
// dzielonej — nie gubimy ani nie tworzymy groszy przy zaokrąglaniu.

/** Ile groszy mieści się w złotówce. */
const GROSZE_PER_ZLOTY = 100;

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Zamienia złotówki na całkowite grosze. Wartości niepoprawne traktujemy jak 0. */
export function toGrosze(zloty: number): number {
  if (!Number.isFinite(zloty)) return 0;
  return Math.round(zloty * GROSZE_PER_ZLOTY);
}

export function toZloty(grosze: number): number {
  return grosze / GROSZE_PER_ZLOTY;
}

/**
 * Rozdziela dokładnie `totalGrosze` pomiędzy udziały opisane przez `targets`
 * (ułamkowe grosze). Suma wyniku jest ZAWSZE równa `totalGrosze`.
 *
 * Reszta z zaokrąglenia trafia do udziałów o największej części ułamkowej
 * (metoda największych reszt). Remisy rozstrzyga kolejność wejściowa, więc
 * dla tych samych danych wynik jest zawsze identyczny.
 */
export function allocateExact(targets: number[], totalGrosze: number): number[] {
  const count = targets.length;
  if (count === 0) return [];

  const safeTotal = Number.isFinite(totalGrosze) ? Math.round(totalGrosze) : 0;
  const safeTargets = targets.map(t => (Number.isFinite(t) ? t : 0));

  const result = safeTargets.map(t => Math.floor(t));
  let remainder = safeTotal - result.reduce((sum, v) => sum + v, 0);

  const byFraction = safeTargets
    .map((t, index) => ({ index, fraction: t - Math.floor(t) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const step = remainder >= 0 ? 1 : -1;
  for (let k = 0; remainder !== 0; k++) {
    result[byFraction[k % count].index] += step;
    remainder -= step;
  }

  return result;
}

/** Dzieli `totalGrosze` po równo na `count` części, bez gubienia reszty. */
export function splitEqually(totalGrosze: number, count: number): number[] {
  if (count <= 0) return [];
  return allocateExact(new Array(count).fill(totalGrosze / count), totalGrosze);
}

/**
 * Jak `allocateExact`, ale żaden udział nie może być ujemny. Udziały, które
 * wyszłyby poniżej zera, zerujemy, a ich koszt rozkładamy na pozostałych —
 * dzięki temu suma nadal zgadza się z kwotą dzieloną.
 */
export function allocateNonNegative(targets: number[], totalGrosze: number): number[] {
  const count = targets.length;
  if (count === 0) return [];

  const eligible = targets.map(t => t > 0);
  // Zerowanie ujemnych udziałów zwiększa kwotę do rozdzielenia między resztę,
  // co może zepchnąć kolejne udziały poniżej zera — stąd pętla.
  for (let guard = 0; guard <= count; guard++) {
    const activeIndexes = targets.map((_, i) => i).filter(i => eligible[i]);
    if (activeIndexes.length === 0) return new Array(count).fill(0);

    const activeTargets = activeIndexes.map(i => targets[i]);
    const activeSum = activeTargets.reduce((sum, t) => sum + t, 0);
    // Skalujemy udziały tak, aby ich suma pokryła całą kwotę.
    const scale = activeSum > 0 ? totalGrosze / activeSum : 0;
    const scaled = activeTargets.map(t => t * scale);

    const allocated = allocateExact(scaled, totalGrosze);
    const negativeAt = allocated.findIndex(v => v < 0);
    if (negativeAt === -1) {
      const result = new Array(count).fill(0);
      activeIndexes.forEach((originalIndex, i) => { result[originalIndex] = allocated[i]; });
      return result;
    }
    eligible[activeIndexes[negativeAt]] = false;
  }

  return new Array(count).fill(0);
}

export function getPayingPlayers(present: string[] = [], multisportPlayers: string[] = []): string[] {
  return present.filter(p => !multisportPlayers.includes(p));
}
