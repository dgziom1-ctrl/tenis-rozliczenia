// Bazowe helpery kosztowe współdzielone przez sessionCost.ts i debt.ts.
// Wydzielone do osobnego modułu, aby uniknąć cyklicznego importu między nimi.
//
// ZASADA: każdy podział kwoty liczymy na CAŁKOWITYCH groszach, nigdy na floatach
// złotówkowych. Dzięki temu suma udziałów jest zawsze dokładnie równa kwocie
// dzielonej — nie gubimy ani nie tworzymy groszy przy zaokrąglaniu.

/** Ile groszy mieści się w złotówce. */
const GROSZE_PER_ZLOTY = 100;

/**
 * Zaokrągla „w połowie od zera”, odporne na błąd reprezentacji zmiennoprzecinkowej.
 *
 * `1.005 * 100` to w IEEE-754 `100.49999999999999`, więc samo `Math.round`
 * zgubiłoby grosz. Przycięcie do 12 cyfr znaczących kasuje ten szum, a nie
 * narusza żadnej kwoty, którą realnie obsługujemy (maks. 100 000 zł = 7 cyfr).
 */
function roundHalfAwayFromZero(value: number): number {
  const magnitude = Math.round(Number(Math.abs(value).toPrecision(12)));
  if (magnitude === 0) return 0; // nigdy nie zwracamy -0
  return value < 0 ? -magnitude : magnitude;
}

export function roundToTwoDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return roundHalfAwayFromZero(value * GROSZE_PER_ZLOTY) / GROSZE_PER_ZLOTY;
}

/** Zamienia złotówki na całkowite grosze. Wartości niepoprawne traktujemy jak 0. */
export function toGrosze(zloty: number): number {
  if (!Number.isFinite(zloty)) return 0;
  return roundHalfAwayFromZero(zloty * GROSZE_PER_ZLOTY);
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
  const remainder = safeTotal - result.reduce((sum, v) => sum + v, 0);

  const byFraction = safeTargets
    .map((t, index) => ({ index, fraction: t - Math.floor(t) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  // Rozdajemy hurtem, nie po jednym groszu: przy `targets`, które nie sumują się
  // do `totalGrosze`, reszta bywa większa niż liczba udziałów, a pętla „+1 na
  // obrót" wykonywałaby wtedy tyle iteracji, ile jest groszy do rozdania.
  // Wynik jest identyczny — każdy udział dostaje pełne obroty, a pierwsze
  // `leftover` udziałów (wg największej reszty) dostaje jeszcze po jednym.
  const fullRounds = Math.trunc(remainder / count);
  if (fullRounds !== 0) {
    for (let i = 0; i < count; i++) result[i] += fullRounds;
  }

  let leftover = remainder - fullRounds * count;
  const step = leftover >= 0 ? 1 : -1;
  for (let k = 0; leftover !== 0; k++) {
    result[byFraction[k].index] += step;
    leftover -= step;
  }

  return result;
}

/** Dzieli `totalGrosze` po równo na `count` części, bez gubienia reszty. */
export function splitEqually(totalGrosze: number, count: number): number[] {
  if (count <= 0) return [];
  return allocateExact(new Array<number>(count).fill(totalGrosze / count), totalGrosze);
}

/**
 * Jak `allocateExact`, ale żaden udział nie może być ujemny. Udziały, które
 * wyszłyby poniżej zera, zerujemy, a ich koszt rozkładamy na pozostałych —
 * dzięki temu suma nadal zgadza się z kwotą dzieloną.
 */
export function allocateNonNegative(targets: number[], totalGrosze: number): number[] {
  const count = targets.length;
  if (count === 0) return [];

  const safeTotal = Number.isFinite(totalGrosze) ? Math.round(totalGrosze) : 0;
  const safeTargets = targets.map(t => (Number.isFinite(t) ? t : 0));

  // Bez ani jednego dodatniego udziału nie ma z czego wyliczyć proporcji.
  // Dzielimy wtedy po równo — kwota musi trafić do graczy w całości, bo
  // zwrócenie samych zer po cichu wyparowałoby ją z rozliczenia.
  if (safeTotal <= 0 || safeTargets.every(t => t <= 0)) {
    return splitEqually(safeTotal, count);
  }

  const eligible = safeTargets.map(t => t > 0);
  // Zerowanie ujemnych udziałów zwiększa kwotę do rozdzielenia między resztę,
  // co może zepchnąć kolejne udziały poniżej zera — stąd pętla.
  for (let guard = 0; guard <= count; guard++) {
    const activeIndexes = safeTargets.map((_, i) => i).filter(i => eligible[i]);
    if (activeIndexes.length === 0) return splitEqually(safeTotal, count);

    const activeTargets = activeIndexes.map(i => safeTargets[i]);
    const activeSum = activeTargets.reduce((sum, t) => sum + t, 0);
    // Skalujemy udziały tak, aby ich suma pokryła całą kwotę.
    const scale = activeSum > 0 ? safeTotal / activeSum : 0;
    const scaled = activeTargets.map(t => t * scale);

    const allocated = allocateExact(scaled, safeTotal);
    const negativeAt = allocated.findIndex(v => v < 0);
    if (negativeAt === -1) {
      const result = new Array<number>(count).fill(0);
      activeIndexes.forEach((originalIndex, i) => { result[originalIndex] = allocated[i]; });
      return result;
    }
    eligible[activeIndexes[negativeAt]] = false;
  }

  return splitEqually(safeTotal, count);
}
