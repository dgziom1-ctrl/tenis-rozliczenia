import { SPORT } from '@/constants';
import { getCourtAmount, inferRacketPricing } from './sessionCost';
import { expectedRefundForForm, resolveCourtRefund } from './courtRefund';
import type { HistoryEntry, SessionEditForm } from '@/types/ui';

/**
 * Formularz edycji wypełniony zapisaną sesją.
 *
 * Edycja bez zmian ma odtworzyć dokładnie tę samą kwotę sesji, dlatego pole
 * kosztu pyta o sam kort (jak przy dodawaniu), a rakiety odtwarzamy z zapisanego
 * kosztu i dokładamy dopiero przy zapisie.
 */
export function buildEditForm(row: HistoryEntry): SessionEditForm {
  const ownRacketCount = (row.ownRacketPlayers ?? [])
    .filter(p => row.presentPlayers.includes(p)).length;
  const racketPricing = inferRacketPricing(
    row.racketCost,
    Math.max(0, row.presentPlayers.length - ownRacketCount),
  );
  const form: SessionEditForm = {
    date: row.datePlayed,
    // Formularz pyta o sam kort — tak jak przy dodawaniu. Rakiety dokładamy
    // dopiero przy zapisie, więc edycja bez zmian nie zmienia kwoty sesji.
    cost: getCourtAmount(row.totalCost, row.racketCost),
    present: [...row.presentPlayers],
    multiPlayers: [...row.multisportPlayers],
    sport: row.sport || SPORT.PINGPONG,
    racketCount: racketPricing.racketCount,
    racketPrice: racketPricing.racketPrice,
    ownRacketPlayers: row.ownRacketPlayers ? [...row.ownRacketPlayers] : [],
    // Stare sesje nie mają tych pól — zostawiamy `undefined`, żeby
    // zapis nie włączył im po cichu limitu kart MultiSport.
    courtCount: row.courtCount,
    durationHours: row.durationHours,
    singleScanPlayers: row.singleScanPlayers ? [...row.singleScanPlayers] : [],
    discountModel: row.discountModel,
  };
  // Nowy sposób wpisywania: cena kortu przed zwrotem + zwrot. Zwrot zostaje
  // „automatyczny”, jeśli zapisany równa się oczekiwanemu; inaczej — ręczny.
  if (row.discountModel === 'perScan' && row.courtGross !== undefined) {
    const net = getCourtAmount(row.totalCost, row.racketCost);
    const stored = Math.round((row.courtGross - net) * 100) / 100;
    const auto = resolveCourtRefund(row.courtGross, undefined, expectedRefundForForm(form)).autoRefund;
    form.courtGross = row.courtGross;
    form.refundOverride = Math.round(auto * 100) === Math.round(stored * 100) ? undefined : stored;
  }
  return form;
}
