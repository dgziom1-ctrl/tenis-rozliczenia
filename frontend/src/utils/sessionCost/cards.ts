import { parseSession } from './session';
import type { ParsedSession, SessionLike } from './session';
import { getSessionShares } from './shares';
import type { CardKind, ShareGroup } from './types';

/**
 * Jaką kartę gracz miał w sesji. Medicover liczy się osobno tylko przy zasadzie
 * `perScan` — w starych sesjach płacił tyle co Multisport, więc nim jest.
 */
function cardKindOf(parsed: ParsedSession, name: string): CardKind {
  if (!parsed.multi.includes(name)) return 'none';
  return parsed.discountModel === 'perScan' && parsed.singleScan.includes(name) ? 'single' : 'multi';
}

/** Rodzaj karty gracza w danej sesji — ta sama reguła co w podziale kosztów. */
export function getPlayerCard(session: SessionLike, name: string): CardKind {
  return cardKindOf(parseSession(session), name);
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
  const parsed = parseSession(session);
  const { present, ownRacket, racketGrosze } = parsed;
  const shares = getSessionShares(session);
  const cardOf = (name: string) => cardKindOf(parsed, name);
  // Bez kosztu rakiet podział na własne i wypożyczone niczego nie zmienia,
  // więc nie rozbijamy grup na dwie identyczne stawki.
  const withOwnRacket = (name: string) => racketGrosze > 0 && ownRacket.includes(name);

  const kinds: CardKind[] = ['none', 'multi', 'single'];
  return [false, true]
    .flatMap(ownRacket => kinds.map(card => ({ card, hasCard: card !== 'none', ownRacket })))
    .map(group => {
      const names = present.filter(p => cardOf(p) === group.card && withOwnRacket(p) === group.ownRacket);
      const total = names.reduce((sum, n) => sum + (shares.byPlayer[n]?.total ?? 0), 0);
      return { ...group, names, perPerson: names.length > 0 ? total / names.length : 0 };
    })
    .filter(group => group.names.length > 0);
}
