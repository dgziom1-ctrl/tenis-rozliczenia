import { MULTISPORT_DISCOUNT } from '@/constants';
import { toGrosze, allocateNonNegative } from '../money';
import { getMaxMulti } from './limits';
import type { ParsedSession } from './session';
import type { CourtSplit } from './types';

/**
 * Dawna zasada (sesje bez `discountModel`): każda karta daje posiadaczowi
 * jedno 15 zł, a zniżki z kolejnych godzin obniżają cenę wszystkim po równo.
 * Zostaje bez zmian, żeby salda ze starych sesji się nie przesunęły.
 */
export function splitCourtLegacy(parsed: ParsedSession, courtGrosze: number): CourtSplit {
  const { present, multi, courtCount, durationHours, sport } = parsed;

  const court = new Map<string, number>();
  let unallocatedGrosze = 0;

  const discount = toGrosze(MULTISPORT_DISCOUNT);
  let discountCapped = false;
  let multiCapped = false;

  // Limit kart MultiSport: korty × godziny × limit/sport.
  // Stare sesje bez courtCount/durationHours: nie aplikujemy limitów (backward compatible).
  const maxMulti = (courtCount !== undefined && durationHours !== undefined && sport !== undefined)
    ? getMaxMulti(sport, courtCount, durationHours)
    : Infinity;
  const multiPresentCount = multi.filter(p => present.includes(p)).length;
  const effectiveCards = Math.min(multiPresentCount, maxMulti);

  if (present.length === 0) {
    unallocatedGrosze += courtGrosze;
  } else {
    multiCapped = multiPresentCount > maxMulti && multiPresentCount > 0;

    // Odtwarzamy cenę pełną: zapłacone + efektywna zniżka (nie więcej niż limit).
    const base = (courtGrosze + effectiveCards * discount) / present.length;

    // Gdy kart jest więcej niż limit, zniżka per karta jest proporcjonalnie mniejsza.
    // Np. 5 kart, limit 4: każda dostaje 4/5 × 15 = 12 zł zamiast 15 zł.
    const discountPerCard = multiPresentCount > 0
      ? Math.floor(effectiveCards * discount / multiPresentCount)
      : 0;
    const remainderGrosze = effectiveCards * discount - discountPerCard * multiPresentCount;

    let targets: number[];
    if (multiPresentCount > 0 && multiPresentCount > maxMulti) {
      // Proporcjonalne dzielenie: każda karta dostaje discountPerCard,
      // a pierwszych `remainderGrosze` kart dostaje jeszcze +1 grosz.
      let cardIndex = 0;
      targets = present.map(p => {
        if (!multi.includes(p)) return base;
        const extra = cardIndex < remainderGrosze ? 1 : 0;
        cardIndex++;
        return base - discountPerCard - extra;
      });
    } else {
      targets = present.map(p => base - (multi.includes(p) ? discount : 0));
    }

    discountCapped = multiPresentCount > 0 && base < (multiPresentCount > maxMulti ? discountPerCard : discount);
    // Gdy zniżka jest większa niż udział, cel schodzi poniżej zera. Wtedy
    // `allocateNonNegative` zeruje takiego gracza, a niewykorzystaną część
    // rabatu rozdziela na pozostałych — suma wciąż daje zapłaconą kwotę.
    const allocated = allocateNonNegative(targets, courtGrosze);
    present.forEach((p, i) => court.set(p, allocated[i]));
  }

  return { court, unallocatedGrosze, discountCapped, multiCapped, maxMulti, effectiveCards };
}
