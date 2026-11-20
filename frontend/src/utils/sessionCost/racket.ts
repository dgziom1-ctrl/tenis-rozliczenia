import { RACKET_PRICE, hasRacketRental } from '@/constants';
import { toGrosze, toZloty } from '../money';

/**
 * Kwota za kort ukryta w zapisanej sesji.
 *
 * W bazie `totalCost` jest kwotą całkowitą (kort + rakiety), a `racketCost`
 * tylko częścią wyodrębnioną. Formularz edycji pyta o kort — tak samo jak
 * formularz dodawania — więc przed wypełnieniem pola odejmujemy rakiety.
 */
export function getCourtAmount(totalCost: number, racketCost = 0): number {
  const total = Math.max(0, toGrosze(totalCost));
  const rackets = Math.min(Math.max(0, toGrosze(racketCost)), total);
  return toZloty(total - rackets);
}

/**
 * Kwota, którą zapisujemy w sesji: kort + rakiety. Odwrotność `getCourtAmount`.
 * Dzięki temu formularz edycji może przyjąć tę samą kwotę co formularz
 * dodawania, a silnik nadal dostaje pełną kwotę sesji.
 */
export function getTotalWithRackets(courtAmount: number, racketCost = 0): number {
  const court = Math.max(0, toGrosze(courtAmount));
  const rackets = Math.max(0, toGrosze(racketCost));
  return toZloty(court + rackets);
}

export interface RacketSelection {
  withRackets: boolean;
  ownRacketPresentCount: number;
  maxRackets: number;
  /** Liczba po przycięciu do graczy bez własnej rakietki. */
  effectiveCount: number;
  price: number;
  /** Łączny koszt wypożyczenia, zawsze w złotych i groszach. */
  cost: number;
}

/**
 * Jedna reguła wypożyczenia dla formularza dodawania i edycji: kto ma własną
 * rakietkę, ile rakiet można wypożyczyć i ile to kosztuje. Dzięki temu edycja
 * nie może pokazać innej liczby niż zapisze.
 */
export function getRacketSelection(
  sport: string | undefined,
  presentPlayers: readonly string[],
  ownRacketPlayers: readonly string[],
  racketCount: number,
  racketPrice: number,
): RacketSelection {
  const withRackets = hasRacketRental(sport);
  const ownRacketPresentCount = ownRacketPlayers.filter(p => presentPlayers.includes(p)).length;
  // Rakiety wypożycza się na graczy, nie na korty: górną granicą jest liczba
  // obecnych bez własnej rakietki. Stały limit 4 („2 korty × 2 rakiety”) ucinał
  // deble i sesje na 3+ kortach.
  const maxRackets = withRackets
    ? Math.max(0, presentPlayers.length - ownRacketPresentCount)
    : 0;
  const effectiveCount = Math.min(Math.max(0, Math.floor(Number(racketCount) || 0)), maxRackets);
  const price = Math.max(0, Number.isFinite(racketPrice) ? racketPrice : 0);
  const cost = withRackets ? toZloty(toGrosze(effectiveCount * price)) : 0;

  return { withRackets, ownRacketPresentCount, maxRackets, effectiveCount, price, cost };
}

/**
 * Odtwarza liczbę i cenę rakiet z zapisanego kosztu. Edycja nie może zmienić
 * kwoty tylko dlatego, że nie znamy historycznego podziału — dlatego szukamy
 * dokładnej pary (count × price) w granicach tego, ilu graczy w ogóle mogło
 * wypożyczyć rakietę. Sprawdzamy wszystkie dzielniki, a nie tylko sąsiadów
 * domyślnej ceny: 48 zł przy 6 graczach to 6 × 8, a nie 1 × 48.
 */
export function inferRacketPricing(
  racketCost: number | undefined,
  maxRackets: number,
): { racketCount: number; racketPrice: number } {
  const cost = Math.max(0, toGrosze(racketCost ?? 0));
  if (cost === 0) return { racketCount: 0, racketPrice: RACKET_PRICE };

  const preferred = Math.max(1, toGrosze(RACKET_PRICE));
  const limit = Math.max(1, Math.floor(maxRackets));
  let bestCount = 1;
  let bestPrice = cost;
  let bestDistance = Math.abs(cost - preferred);

  for (let count = 2; count <= limit; count++) {
    if (cost % count !== 0) continue;
    const perRacket = cost / count;
    const distance = Math.abs(perRacket - preferred);
    if (distance < bestDistance) {
      bestCount = count;
      bestPrice = perRacket;
      bestDistance = distance;
    }
  }

  return { racketCount: bestCount, racketPrice: toZloty(bestPrice) };
}
