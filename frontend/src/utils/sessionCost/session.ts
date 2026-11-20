import { toGrosze } from '../money';
import type { DiscountModel } from '@/types/domain';


/**
 * Akceptuje zarówno surową sesję z bazy (`present` / `multiPlayers` / `cost`),
 * jak i wpis historii zbudowany dla UI (`presentPlayers` / `multisportPlayers`
 * / `totalCost`). Dzięki temu koszt liczy JEDNA funkcja dla obu kształtów.
 */
export interface SessionLike {
  presentPlayers?: string[];
  present?: string[];
  multisportPlayers?: string[];
  multiPlayers?: string[];
  totalCost?: number;
  cost?: number;
  sport?: string;
  racketCost?: number;
  ownRacketPlayers?: string[];
  /** Liczba kortów/stołów. Domyślnie 1 (stare sesje). */
  courtCount?: number;
  /** Czas trwania sesji w godzinach. Domyślnie 1 (stare sesje). */
  durationHours?: number;
  /** @deprecated Zaszłość po dogrywce — doliczana do kwoty sesji, patrz `parseSession`. */
  overtimeCost?: number;
  /**
   * Posiadacze kart, którzy odbijają się tylko raz na sesję (np. Medicover).
   * Podzbiór kart (`multiPlayers`), znaczenie tylko przy `discountModel: 'perScan'`.
   */
  singleScanPlayers?: string[];
  /**
   * Zasada podziału zniżek. `'perScan'` — każde odbicie karty idzie do tego,
   * kto się odbił. Brak pola — dawna zasada (stare sesje, patrz `computeShares`).
   */
  discountModel?: DiscountModel;
  /**
   * Cena kortu przed zwrotem za karty (bez rakiet). Razem z kwotą kortu po
   * zwrocie wyznacza faktyczny zwrot — pulę zniżek bierzemy z tego faktu, a nie
   * ze stałej. Znaczenie tylko przy `discountModel: 'perScan'`.
   */
  courtGross?: number;
}

/** Typ żyje w `types/domain`; reeksport zostaje, bo to część publicznego API silnika. */
export type { DiscountModel };
/** Zasada podziału zniżek dla nowo zapisywanych sesji. */
export const CURRENT_DISCOUNT_MODEL: DiscountModel = 'perScan';

export interface ParsedSession {
  present: string[];
  multi: string[];
  totalGrosze: number;
  racketGrosze: number;
  ownRacket: string[];
  courtCount?: number;
  durationHours?: number;
  sport?: string;
  singleScan: string[];
  discountModel?: DiscountModel;
  /** Cena kortu przed zwrotem w groszach; tylko gdy poprawna i niemniejsza niż kort po zwrocie. */
  courtGrossGrosze?: number;
}

/**
 * Lista imion bez duplikatów, pustych wpisów i wartości nie-tekstowych.
 *
 * Udziały trzymamy w mapie po imieniu, więc powtórzone imię dostałoby dwa
 * udziały, a odczytany zostałby jeden — różnica wyparowałaby z rozliczenia.
 * Zapis do bazy już odsiewa duplikaty; to zabezpieczenie dla starszych
 * rekordów, które trafiły tam przed tamtą walidacją.
 */
function uniqueNames(names: readonly unknown[] | undefined): string[] {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  for (const name of names) {
    if (typeof name === 'string' && name.length > 0) seen.add(name);
  }
  return [...seen];
}

export function parseSession(session: SessionLike): ParsedSession {
  const present = uniqueNames(session.presentPlayers ?? session.present);
  // `overtimeCost` to zaszłość po usuniętej dogrywce: doliczamy ją do kwoty
  // sesji, żeby stare rekordy nie zgubiły pieniędzy z sald graczy.
  const totalGrosze = Math.max(0, toGrosze(session.totalCost ?? session.cost ?? 0))
    + Math.max(0, toGrosze(session.overtimeCost ?? 0));
  // Cena rakiet jest częścią kwoty sesji, więc nigdy nie może jej przekroczyć.
  const racketGrosze = Math.min(Math.max(0, toGrosze(session.racketCost ?? 0)), totalGrosze);
  const isPerScan = session.discountModel === 'perScan';
  const grossRaw = session.courtGross;
  const grossGrosze = isPerScan && typeof grossRaw === 'number' && Number.isFinite(grossRaw) && grossRaw >= 0
    ? toGrosze(grossRaw)
    : undefined;
  // Zwrot nie może być ujemny: cena przed zwrotem mniejsza niż kwota po zwrocie
  // to zepsuty rekord, więc liczymy sesję tak, jakby pola nie było.
  const courtGrossGrosze = grossGrosze !== undefined && grossGrosze >= totalGrosze - racketGrosze
    ? grossGrosze
    : undefined;

  return {
    courtGrossGrosze,
    present,
    multi: uniqueNames(session.multisportPlayers ?? session.multiPlayers),
    totalGrosze,
    racketGrosze,
    ownRacket: uniqueNames(session.ownRacketPlayers),
    // Stare sesje bez tych pól: courtCount/durationHours = undefined,
    // co oznacza "nie aplikuj limitów" (backward compatible).
    courtCount: session.courtCount != null ? Math.max(1, session.courtCount) : undefined,
    durationHours: session.durationHours != null ? Math.max(1, session.durationHours) : undefined,
    sport: session.sport,
    singleScan: uniqueNames(session.singleScanPlayers),
    discountModel: session.discountModel === 'perScan' ? 'perScan' : undefined,
  };
}
