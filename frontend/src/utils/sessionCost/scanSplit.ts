import { MULTISPORT_DISCOUNT } from '@/constants';
import { toGrosze, allocateExact, allocateNonNegative } from '../money';
import { getMultisportPerCourtHour } from './limits';
import type { ParsedSession } from './session';
import type { CourtSplit } from './types';

/**
 * Zniżki wynikające z reguł: ile odbić zadziałało i ile groszy przypada każdemu
 * odbijającemu. Wspólne dla podziału kosztów i dla `getExpectedRefund`, żeby
 * „oczekiwany zwrot" nie miał własnej, rozjeżdżającej się pętli.
 */
export function computeScanCredits(parsed: ParsedSession) {
  const { present, multi, singleScan, courtCount, durationHours, sport } = parsed;
  const discount = toGrosze(MULTISPORT_DISCOUNT);
  const hours = durationHours ?? 1;
  const hasLimits = courtCount !== undefined && durationHours !== undefined && sport !== undefined;
  const perHourCapacity = hasLimits ? courtCount * getMultisportPerCourtHour(sport) : Infinity;

  const cardHolders = present.filter(p => multi.includes(p));
  const everyHour = cardHolders.filter(p => !singleScan.includes(p));

  const credit = new Map<string, number>(present.map(p => [p, 0]));
  let effectiveScans = 0;
  let multiCapped = false;
  for (let hour = 1; hour <= hours; hour++) {
    const scanners = hour === 1 ? cardHolders : everyHour;
    if (scanners.length === 0) continue;
    const effective = Math.min(scanners.length, perHourCapacity);
    if (scanners.length > perHourCapacity) multiCapped = true;
    effectiveScans += effective;
    const pool = effective * discount;
    const perScan = Math.floor(pool / scanners.length);
    const remainder = pool - perScan * scanners.length;
    scanners.forEach((p, i) => {
      credit.set(p, (credit.get(p) ?? 0) + perScan + (i < remainder ? 1 : 0));
    });
  }
  return { credit, effectiveScans, multiCapped, perHourCapacity, hours, hasLimits };
}

/**
 * Zasada „odbicie dla odbijającego” (`discountModel: 'perScan'`).
 *
 * Kwota sesji to cena po wszystkich odbiciach. Odtwarzamy cenę pełną, dzielimy
 * ją po równo, a każdy odejmuje sobie 15 zł za każde SWOJE odbicie. Karta MS
 * odbija się co godzinę, karta jednorazowa (Medicover) tylko w 1. godzinie,
 * bez karty — wcale. Limit obiektu działa per godzina (korty × limit/sport);
 * gdy w danej godzinie chętnych jest więcej, zniżkę tej godziny dzielimy
 * proporcjonalnie między odbijających.
 */
export function splitCourtPerScan(parsed: ParsedSession, courtGrosze: number): CourtSplit {
  const { present, courtGrossGrosze } = parsed;
  const court = new Map<string, number>();
  const scans = computeScanCredits(parsed);
  const { effectiveScans, multiCapped, perHourCapacity, hours, hasLimits } = scans;
  let credit = scans.credit;

  // Faktyczny zwrot (cena przed zwrotem − kwota po zwrocie) wygrywa ze stałą:
  // dzielimy go między odbijających w tych samych proporcjach co zniżki z reguł.
  // Gdy się zgadza z regułami, zostaje dotychczasowy podział co do grosza.
  if (courtGrossGrosze !== undefined) {
    const actualPool = courtGrossGrosze - courtGrosze;
    const expectedPool = [...credit.values()].reduce((sum, c) => sum + c, 0);
    if (expectedPool > 0 && actualPool !== expectedPool) {
      const names = [...credit.keys()];
      const scaled = allocateExact(names.map(n => (credit.get(n) ?? 0) * actualPool / expectedPool), actualPool);
      credit = new Map(names.map((n, i) => [n, scaled[i]]));
    }
  }

  if (present.length === 0) {
    return {
      court, unallocatedGrosze: courtGrosze, discountCapped: false, multiCapped: false,
      maxMulti: hasLimits ? perHourCapacity * hours : Infinity, effectiveCards: 0,
    };
  }

  const totalCredit = [...credit.values()].reduce((sum, c) => sum + c, 0);
  const base = (courtGrosze + totalCredit) / present.length;
  const targets = present.map(p => base - (credit.get(p) ?? 0));
  const allocated = allocateNonNegative(targets, courtGrosze);
  present.forEach((p, i) => court.set(p, allocated[i]));

  return {
    court,
    unallocatedGrosze: 0,
    discountCapped: targets.some(t => t < 0),
    multiCapped,
    maxMulti: hasLimits ? perHourCapacity * hours : Infinity,
    effectiveCards: effectiveScans,
  };
}
