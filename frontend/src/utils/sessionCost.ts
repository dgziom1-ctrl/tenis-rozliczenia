import { MULTISPORT_DISCOUNT } from '@/constants';
import { toGrosze, toZloty, allocateNonNegative, splitEqually } from './money';

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
  /** @deprecated Zaszłość po dogrywce — doliczana do kwoty sesji, patrz `parseSession`. */
  overtimeCost?: number;
}

/** Rozbicie kosztu jednego gracza w danej sesji (w złotych). */
interface PlayerShare {
  court: number;
  racket: number;
  total: number;
}

export interface SessionShares {
  /** Udział każdego obecnego gracza, klucz = imię. */
  byPlayer: Record<string, PlayerShare>;
  /** Koszt kortu na osobę bez zniżki — wartość poglądowa do UI. */
  baseCourt: number;
  /** Koszt kortu na osobę ze zniżką Multisport — wartość poglądowa do UI. */
  baseCourtMulti: number;
  /**
   * Kwota, której nie dało się przypisać nikomu (sesja bez obecnych graczy albo
   * rakiety, gdy każdy przyszedł z własną). Pokrywa ją organizator.
   */
  unallocated: number;
}

const EMPTY_SHARE: PlayerShare = { court: 0, racket: 0, total: 0 };

interface ParsedSession {
  present: string[];
  multi: string[];
  totalGrosze: number;
  racketGrosze: number;
  ownRacket: string[];
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

function parseSession(session: SessionLike): ParsedSession {
  const present = uniqueNames(session.presentPlayers ?? session.present);
  // `overtimeCost` to zaszłość po usuniętej dogrywce: doliczamy ją do kwoty
  // sesji, żeby stare rekordy nie zgubiły pieniędzy z sald graczy.
  const totalGrosze = Math.max(0, toGrosze(session.totalCost ?? session.cost ?? 0))
    + Math.max(0, toGrosze(session.overtimeCost ?? 0));
  // Cena rakiet jest częścią kwoty sesji, więc nigdy nie może jej przekroczyć.
  const racketGrosze = Math.min(Math.max(0, toGrosze(session.racketCost ?? 0)), totalGrosze);

  return {
    present,
    multi: uniqueNames(session.multisportPlayers ?? session.multiPlayers),
    totalGrosze,
    racketGrosze,
    ownRacket: uniqueNames(session.ownRacketPlayers),
  };
}

/**
 * Podział jest wspólny dla wszystkich dyscyplin: kwota sesji to tyle, ile
 * organizator faktycznie zapłacił w recepcji — czyli cena kortu pomniejszona
 * o zniżkę za każdą okazaną kartę Multisport. Żeby rabat trafił do tego, kto
 * kartę przyniósł, odtwarzamy cenę „pełną" (`base`), a posiadaczom kart
 * odejmujemy od niej stałą zniżkę. Suma udziałów nadal daje realny koszt.
 */
function computeShares(parsed: ParsedSession): SessionShares {
  const { present, multi, totalGrosze, racketGrosze, ownRacket } = parsed;

  const court = new Map<string, number>();
  const racket = new Map<string, number>();
  let unallocatedGrosze = 0;

  const discount = toGrosze(MULTISPORT_DISCOUNT);
  let baseCourtGrosze = 0;
  let baseCourtMultiGrosze = 0;

  const courtGrosze = totalGrosze - racketGrosze;
  const renters = present.filter(p => !ownRacket.includes(p));
  const racketPerPerson = renters.length > 0 ? racketGrosze / renters.length : 0;

  if (present.length === 0) {
    unallocatedGrosze += courtGrosze;
  } else {
    const multiPresentCount = multi.filter(p => present.includes(p)).length;
    const base = (courtGrosze + multiPresentCount * discount) / present.length;
    const targets = present.map(p => base - (multi.includes(p) ? discount : 0));
    const allocated = allocateNonNegative(targets, courtGrosze);
    present.forEach((p, i) => court.set(p, allocated[i]));

    baseCourtGrosze = Math.round(base + racketPerPerson);
    baseCourtMultiGrosze = Math.round(Math.max(0, base - discount) + racketPerPerson);
  }

  if (renters.length === 0) {
    unallocatedGrosze += racketGrosze;
  } else {
    const allocated = splitEqually(racketGrosze, renters.length);
    renters.forEach((p, i) => racket.set(p, allocated[i]));
  }

  const byPlayer: Record<string, PlayerShare> = {};
  for (const name of present) {
    const courtPart = court.get(name) ?? 0;
    const racketPart = racket.get(name) ?? 0;
    byPlayer[name] = {
      court: toZloty(courtPart),
      racket: toZloty(racketPart),
      total: toZloty(courtPart + racketPart),
    };
  }

  return {
    byPlayer,
    baseCourt: toZloty(baseCourtGrosze),
    baseCourtMulti: toZloty(baseCourtMultiGrosze),
    unallocated: toZloty(unallocatedGrosze),
  };
}

// Saldo każdego gracza przelicza te same sesje wiele razy, więc trzymamy wynik
// przy obiekcie sesji. Sesje są niemutowalnymi snapshotami z bazy.
const sharesCache = new WeakMap<SessionLike, SessionShares>();

/**
 * Jedyne źródło prawdy dla podziału kosztów sesji.
 *
 * Cała arytmetyka idzie na całkowitych groszach, więc suma udziałów graczy
 * plus `unallocated` jest zawsze dokładnie równa kwocie sesji.
 */
export function getSessionShares(session: SessionLike): SessionShares {
  if (!session || typeof session !== 'object') {
    return { byPlayer: {}, baseCourt: 0, baseCourtMulti: 0, unallocated: 0 };
  }
  const cached = sharesCache.get(session);
  if (cached) return cached;

  const shares = computeShares(parseSession(session));
  sharesCache.set(session, shares);
  return shares;
}

function getPlayerShare(session: SessionLike, playerName: string): PlayerShare {
  return getSessionShares(session).byPlayer[playerName] ?? EMPTY_SHARE;
}

/** Koszt jednej sesji przypadający na konkretnego gracza (w złotych). */
export function getPlayerSessionCost(session: SessionLike, playerName: string): number {
  return getPlayerShare(session, playerName).total;
}

/** Poglądowy koszt kortu na osobę, bez zniżki Multisport i bez rakiet. */
export function getSessionBaseCost(session: SessionLike): number {
  const { present, multi, totalGrosze, racketGrosze } = parseSession(session);
  if (present.length === 0) return 0;

  const discount = toGrosze(MULTISPORT_DISCOUNT);
  const multiPresentCount = multi.filter(p => present.includes(p)).length;
  const courtGrosze = totalGrosze - racketGrosze;
  return toZloty(Math.round((courtGrosze + multiPresentCount * discount) / present.length));
}