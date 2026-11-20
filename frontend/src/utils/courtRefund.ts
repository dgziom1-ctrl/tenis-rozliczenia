import { parseAmount } from './format';
import { toGrosze, toZloty } from './money';
import { getExpectedRefund } from './sessionCost';
import type { SessionEditForm } from '@/types/ui';

/**
 * Cena kortu z rezerwacji, zwrot za karty i kwota, która zostaje do
 * rozdzielenia — jedno miejsce dla formularza dodawania i edycji.
 *
 * Zwrot domyślnie jest automatyczny (oczekiwany wg reguł, nie większy niż cena
 * kortu). Gdy użytkownik wpisze własną kwotę z portfela, ona wygrywa, a różnica
 * względem reguł kończy jako ostrzeżenie.
 */
export interface CourtRefundResolution {
  /** Cena kortu przed zwrotem albo `null`, gdy pole puste lub błędne. */
  gross: number | null;
  /** Zwrot użyty do wyliczenia kwoty kortu (zł). */
  refund: number;
  /** Zwrot wg reguł, przycięty do ceny kortu (zł). */
  autoRefund: number;
  isManual: boolean;
  /** Kwota kortu po zwrocie — to, co trafia do `cost` (zł); `null`, gdy brak ceny. */
  net: number | null;
  /** Błąd blokujący zapis albo `null`. */
  error: string | null;
  /** Ręczny zwrot różni się od oczekiwanego. */
  mismatch: boolean;
}

export function resolveCourtRefund(
  grossText: string | number | undefined,
  overrideText: string | number | undefined,
  expectedRefund: number,
): CourtRefundResolution {
  const parsedGross = parseAmount(grossText);
  const hasGross = Number.isFinite(parsedGross) && parsedGross >= 0;
  const gross = hasGross ? parsedGross : null;
  const autoRefund = gross === null ? expectedRefund : Math.min(expectedRefund, gross);

  const isManual = overrideText !== undefined;
  let refund = autoRefund;
  let error: string | null = null;
  if (isManual) {
    const parsed = parseAmount(overrideText);
    if (!Number.isFinite(parsed) || parsed < 0) {
      error = 'Wpisz kwotę zwrotu cyframi, np. 30';
      refund = 0;
    } else {
      refund = parsed;
    }
  }
  if (gross !== null && toGrosze(refund) > toGrosze(gross)) {
    error = 'Zwrot nie może być większy niż cena kortu';
  }

  const net = gross === null || error ? null : toZloty(toGrosze(gross) - toGrosze(refund));
  return {
    gross,
    refund,
    autoRefund,
    isManual,
    net,
    error,
    mismatch: isManual && !error && toGrosze(refund) !== toGrosze(autoRefund),
  };
}

/** Zwrot wg reguł dla stanu formularza edycji (karty, godziny, korty, sport). */
export function expectedRefundForForm(form: SessionEditForm): number {
  const present = form.present ?? [];
  const multi = (form.multiPlayers ?? []).filter(p => present.includes(p));
  return getExpectedRefund({
    presentPlayers: present,
    multisportPlayers: multi,
    singleScanPlayers: (form.singleScanPlayers ?? []).filter(p => multi.includes(p)),
    courtCount: form.courtCount,
    durationHours: form.durationHours,
    sport: form.sport,
  });
}

/**
 * Rozliczenie ceny i zwrotu w formularzu edycji — `null` dla sesji sprzed
 * nowego sposobu wpisywania (bez `courtGross`), które zostają przy jednym polu.
 */
export function resolveEditRefund(form: SessionEditForm): CourtRefundResolution | null {
  if (form.courtGross === undefined) return null;
  return resolveCourtRefund(form.courtGross, form.refundOverride, expectedRefundForForm(form));
}

/** Komunikat dla pola „cena kortu” albo null, gdy poprawne. */
export function grossError(text: string | number | undefined): string | null {
  if (text === undefined || String(text).trim() === '') return 'Wpisz cenę kortu z rezerwacji';
  const amount = parseAmount(text);
  if (Number.isNaN(amount)) return 'Wpisz kwotę cyframi, np. 56';
  if (amount < 0) return 'Cena nie może być ujemna';
  return null;
}
