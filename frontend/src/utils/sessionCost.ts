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
  /** Ile średnio płaci obecny gracz bez karty Multisport. */
  baseCourt: number;
  /** Ile średnio płaci obecny gracz z kartą Multisport. */
  baseCourtMulti: number;
  /**
   * Zniżka za kartę nie zmieściła się w udziale gracza, więc rabat zadziałał
   * słabiej niż `MULTISPORT_DISCOUNT`. Zwykle znak, że wpisana kwota jest
   * niższa, niż powinna być przy tylu kartach.
   */
  discountCapped: boolean;
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
  const courtGrosze = totalGrosze - racketGrosze;
  const renters = present.filter(p => !ownRacket.includes(p));
  let discountCapped = false;

  if (present.length === 0) {
    unallocatedGrosze += courtGrosze;
  } else {
    const multiPresentCount = multi.filter(p => present.includes(p)).length;
    const base = (courtGrosze + multiPresentCount * discount) / present.length;
    const targets = present.map(p => base - (multi.includes(p) ? discount : 0));
    discountCapped = multiPresentCount > 0 && base < discount;
    // Gdy zniżka jest większa niż udział, cel schodzi poniżej zera. Wtedy
    // `allocateNonNegative` zeruje takiego gracza, a niewykorzystaną część
    // rabatu rozdziela na pozostałych — suma wciąż daje zapłaconą kwotę.
    const allocated = allocateNonNegative(targets, courtGrosze);
    present.forEach((p, i) => court.set(p, allocated[i]));
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

  // Stawki poglądowe czytamy z gotowego podziału zamiast liczyć drugim wzorem.
  // Wzór `base - zniżka` potrafi wskazać kwotę, której nikt nie zapłaci — tak
  // było, gdy zniżki za karty przewyższały to, co organizator wyłożył.
  const shareOf = (name: string) => (court.get(name) ?? 0) + (racket.get(name) ?? 0);
  const average = (names: string[]) => names.reduce((sum, n) => sum + shareOf(n), 0) / names.length;
  const withCard = present.filter(p => multi.includes(p));
  const withoutCard = present.filter(p => !multi.includes(p));

  const baseCourtGrosze = withoutCard.length > 0 ? average(withoutCard)
    : withCard.length > 0 ? average(withCard)
    : 0;

  return {
    byPlayer,
    baseCourt: toZloty(Math.round(baseCourtGrosze)),
    baseCourtMulti: toZloty(Math.round(withCard.length > 0 ? average(withCard) : baseCourtGrosze)),
    discountCapped,
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
    return { byPlayer: {}, baseCourt: 0, baseCourtMulti: 0, discountCapped: false, unallocated: 0 };
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

/** Grupa graczy płacących w tej sesji tę samą stawkę. */
export interface ShareGroup {
  names: string[];
  hasCard: boolean;
  ownRacket: boolean;
  /** Ile wypada na osobę w tej grupie — prosto z podziału sesji. */
  perPerson: number;
}

/**
 * Rozbicie sesji na grupy o wspólnej stawce, w kolejności do pokazania.
 *
 * Podgląd, wiadomość na grupę i podsumowanie po zapisie mają dzięki temu jedno
 * źródło liczb. Wcześniej każde z nich liczyło po swojemu i przy zniżce
 * większej niż udział pokazywały stawki, które nie sumowały się do zapłaconej
 * kwoty.
 */
export function getShareGroups(session: SessionLike): ShareGroup[] {
  const { present, multi, ownRacket, racketGrosze } = parseSession(session);
  const shares = getSessionShares(session);

  const hasCard = (name: string) => multi.includes(name);
  // Bez kosztu rakiet podział na własne i wypożyczone niczego nie zmienia,
  // więc nie rozbijamy grup na dwie identyczne stawki.
  const withOwnRacket = (name: string) => racketGrosze > 0 && ownRacket.includes(name);

  return [
    { hasCard: false, ownRacket: false },
    { hasCard: true, ownRacket: false },
    { hasCard: false, ownRacket: true },
    { hasCard: true, ownRacket: true },
  ]
    .map(group => {
      const names = present.filter(p => hasCard(p) === group.hasCard && withOwnRacket(p) === group.ownRacket);
      const total = names.reduce((sum, n) => sum + (shares.byPlayer[n]?.total ?? 0), 0);
      return { ...group, names, perPerson: names.length > 0 ? total / names.length : 0 };
    })
    .filter(group => group.names.length > 0);
}
