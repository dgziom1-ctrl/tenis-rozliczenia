import { toZloty, splitEqually } from '../money';
import { parseSession } from './session';
import type { ParsedSession, SessionLike } from './session';
import { splitCourtLegacy } from './legacySplit';
import { splitCourtPerScan } from './scanSplit';
import type { PlayerShare, SessionShares } from './types';

const EMPTY_SHARE: PlayerShare = { court: 0, racket: 0, total: 0 };

/**
 * Podział jest wspólny dla wszystkich dyscyplin: kwota sesji to tyle, ile
 * organizator faktycznie zapłacił w recepcji — czyli cena kortu pomniejszona
 * o zniżkę za każdą okazaną kartę Multisport. Żeby rabat trafił do tego, kto
 * kartę przyniósł, odtwarzamy cenę „pełną" (`base`), a posiadaczom kart
 * odejmujemy od niej zniżkę. Gdy kart jest więcej niż limit obiektu, łączna
 * zniżka jest ograniczona do `effectiveCards × MULTISPORT_DISCOUNT` i dzielona
 * proporcjonalnie na wszystkich posiadaczy kart.
 *
 * Sposób liczenia zniżek zależy od `discountModel` sesji — patrz
 * `splitCourtPerScan` (nowe sesje) i `splitCourtLegacy` (stare).
 */
function computeShares(parsed: ParsedSession): SessionShares {
  const { present, multi, totalGrosze, racketGrosze, ownRacket } = parsed;

  const racket = new Map<string, number>();
  const courtGrosze = totalGrosze - racketGrosze;
  const renters = present.filter(p => !ownRacket.includes(p));

  const split = parsed.discountModel === 'perScan'
    ? splitCourtPerScan(parsed, courtGrosze)
    : splitCourtLegacy(parsed, courtGrosze);
  const { court, discountCapped, multiCapped, maxMulti, effectiveCards } = split;
  let unallocatedGrosze = split.unallocatedGrosze;

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
  // Medicover ma osobną stawkę tylko przy zasadzie `perScan`; w starych
  // sesjach płacił tyle co Multisport, więc liczy się razem z nim.
  const withSingle = parsed.discountModel === 'perScan'
    ? present.filter(p => multi.includes(p) && parsed.singleScan.includes(p))
    : [];
  const withCard = present.filter(p => multi.includes(p) && !withSingle.includes(p));
  const withoutCard = present.filter(p => !multi.includes(p));

  const baseCourtGrosze = withoutCard.length > 0 ? average(withoutCard)
    : withCard.length > 0 ? average(withCard)
    : withSingle.length > 0 ? average(withSingle)
    : 0;

  return {
    byPlayer,
    baseCourt: toZloty(Math.round(baseCourtGrosze)),
    baseCourtMulti: toZloty(Math.round(withCard.length > 0 ? average(withCard) : baseCourtGrosze)),
    baseCourtSingle: withSingle.length > 0 ? toZloty(Math.round(average(withSingle))) : null,
    discountCapped,
    multiCapped,
    maxMulti,
    effectiveCards,
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
    return { byPlayer: {}, baseCourt: 0, baseCourtMulti: 0, baseCourtSingle: null, discountCapped: false, multiCapped: false, maxMulti: 0, effectiveCards: 0, unallocated: 0 };
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
