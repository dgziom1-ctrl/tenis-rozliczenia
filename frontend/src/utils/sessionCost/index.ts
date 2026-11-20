/**
 * Silnik rozliczeń sesji — jedyne źródło prawdy dla podziału kosztów.
 *
 * Moduły:
 * - session   — kształt sesji i jej normalizacja do groszy (`parseSession`),
 * - limits    — limit kart Multisport na kort i godzinę,
 * - racket    — kwota kortu, rakiety i ich cena,
 * - scanSplit — zasada „odbicie dla odbijającego” (`discountModel: 'perScan'`),
 * - legacySplit — dawna zasada (sesje bez `discountModel`), bez zmian,
 * - shares    — udziały graczy (`getSessionShares`) z pamięcią podręczną,
 * - refund    — zwrot za karty oczekiwany i faktyczny,
 * - cards     — rodzaj karty gracza i grupy stawek do pokazania.
 *
 * Serwerową kopią (Cloud Functions, osobny pakiet CommonJS) jest
 * `functions/sessionCost.js`; zgodność obu pilnują testy parity i siatka sesji.
 * Importuj z `@/utils/sessionCost` — ten plik jest publicznym API silnika.
 */
export type { SessionLike, DiscountModel } from './session';
export { CURRENT_DISCOUNT_MODEL } from './session';
export type { SessionShares, CardKind, ShareGroup } from './types';
export { getMaxMulti, getMultisportPerCourtHour } from './limits';
export { getCourtAmount, getTotalWithRackets, getRacketSelection, inferRacketPricing } from './racket';
export type { RacketSelection } from './racket';
export { getSessionShares, getPlayerSessionCost } from './shares';
export { getExpectedRefund, getCourtRefund } from './refund';
export { getPlayerCard, getShareGroups } from './cards';
