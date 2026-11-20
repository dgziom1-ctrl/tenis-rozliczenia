import { MULTISPORT_DISCOUNT, MULTISPORT_PER_COURT_HOUR, RACKET_PRICE, SPORT, hasRacketRental } from '@/constants';
import { toGrosze, toZloty, allocateExact, allocateNonNegative, splitEqually } from './money';
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
  /** Ile średnio płaci gracz z Medicoverem; `null`, gdy nikt go nie miał. */
  baseCourtSingle: number | null;
  /**
   * Zniżka za kartę nie zmieściła się w udziale gracza, więc rabat zadziałał
   * słabiej niż `MULTISPORT_DISCOUNT`. Zwykle znak, że wpisana kwota jest
   * niższa, niż powinna być przy tylu kartach.
   */
  discountCapped: boolean;
  /**
   * Liczba zaznaczonych kart przekroczyła limit obiektu (korty × godziny × limit/sport).
   * Zniżka została proporcjonalnie podzielona na wszystkich posiadaczy kart.
   */
  multiCapped: boolean;
  /** Maksymalna liczba kart honorowanych przez obiekt w tej sesji. */
  maxMulti: number;
  /**
   * Ile kart faktycznie zadziałało (≤ maxMulti). Przy `perScan` liczone
   * w odbiciach: karta MS na 2h to 2 odbicia, Medicover zawsze 1.
   */
  effectiveCards: number;
  /**
   * Kwota, której nie dało się przypisać nikomu (sesja bez obecnych graczy albo
   * rakiety, gdy każdy przyszedł z własną). Pokrywa ją organizator.
   */
  unallocated: number;
}

const EMPTY_SHARE: PlayerShare = { court: 0, racket: 0, total: 0 };

/**
 * Kwota za kort ukryta w zapisanej sesji.
 *
 * W bazie `totalCost` jest kwotą całkowitą (kort + rakiety), a `racketCost`
 * tylko częścią wyodrębnioną. Formularz edycji pyta o kort — tak samo jak
 * formularz dodawania — więc przed wypełnieniem pola odejmujemy rakiety.
 */
export function getCourtAmount(totalCost: number, racketCost = 0): number {
  const total = Math.max(0, toGrosze(totalCost));
  const rackets = Math.min(Math.max(0, toGrosze(racketCost)), total);
  return toZloty(total - rackets);
}

/**
 * Kwota, którą zapisujemy w sesji: kort + rakiety. Odwrotność `getCourtAmount`.
 * Dzięki temu formularz edycji może przyjąć tę samą kwotę co formularz
 * dodawania, a silnik nadal dostaje pełną kwotę sesji.
 */
export function getTotalWithRackets(courtAmount: number, racketCost = 0): number {
  const court = Math.max(0, toGrosze(courtAmount));
  const rackets = Math.max(0, toGrosze(racketCost));
  return toZloty(court + rackets);
}

export interface RacketSelection {
  withRackets: boolean;
  ownRacketPresentCount: number;
  maxRackets: number;
  /** Liczba po przycięciu do graczy bez własnej rakietki. */
  effectiveCount: number;
  price: number;
  /** Łączny koszt wypożyczenia, zawsze w złotych i groszach. */
  cost: number;
}

/**
 * Jedna reguła wypożyczenia dla formularza dodawania i edycji: kto ma własną
 * rakietkę, ile rakiet można wypożyczyć i ile to kosztuje. Dzięki temu edycja
 * nie może pokazać innej liczby niż zapisze.
 */
export function getRacketSelection(
  sport: string | undefined,
  presentPlayers: readonly string[],
  ownRacketPlayers: readonly string[],
  racketCount: number,
  racketPrice: number,
): RacketSelection {
  const withRackets = hasRacketRental(sport);
  const ownRacketPresentCount = ownRacketPlayers.filter(p => presentPlayers.includes(p)).length;
  // Rakiety wypożycza się na graczy, nie na korty: górną granicą jest liczba
  // obecnych bez własnej rakietki. Stały limit 4 („2 korty × 2 rakiety”) ucinał
  // deble i sesje na 3+ kortach.
  const maxRackets = withRackets
    ? Math.max(0, presentPlayers.length - ownRacketPresentCount)
    : 0;
  const effectiveCount = Math.min(Math.max(0, Math.floor(Number(racketCount) || 0)), maxRackets);
  const price = Math.max(0, Number.isFinite(racketPrice) ? racketPrice : 0);
  const cost = withRackets ? toZloty(toGrosze(effectiveCount * price)) : 0;

  return { withRackets, ownRacketPresentCount, maxRackets, effectiveCount, price, cost };
}

/**
 * Odtwarza liczbę i cenę rakiet z zapisanego kosztu. Edycja nie może zmienić
 * kwoty tylko dlatego, że nie znamy historycznego podziału — dlatego szukamy
 * dokładnej pary (count × price) w granicach tego, ilu graczy w ogóle mogło
 * wypożyczyć rakietę. Sprawdzamy wszystkie dzielniki, a nie tylko sąsiadów
 * domyślnej ceny: 48 zł przy 6 graczach to 6 × 8, a nie 1 × 48.
 */
export function inferRacketPricing(
  racketCost: number | undefined,
  maxRackets: number,
): { racketCount: number; racketPrice: number } {
  const cost = Math.max(0, toGrosze(racketCost ?? 0));
  if (cost === 0) return { racketCount: 0, racketPrice: RACKET_PRICE };

  const preferred = Math.max(1, toGrosze(RACKET_PRICE));
  const limit = Math.max(1, Math.floor(maxRackets));
  let bestCount = 1;
  let bestPrice = cost;
  let bestDistance = Math.abs(cost - preferred);

  for (let count = 2; count <= limit; count++) {
    if (cost % count !== 0) continue;
    const perRacket = cost / count;
    const distance = Math.abs(perRacket - preferred);
    if (distance < bestDistance) {
      bestCount = count;
      bestPrice = perRacket;
      bestDistance = distance;
    }
  }

  return { racketCount: bestCount, racketPrice: toZloty(bestPrice) };
}

interface ParsedSession {
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

function parseSession(session: SessionLike): ParsedSession {
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

/**
 * Oblicza maksymalną liczbę kart MultiSport honorowanych w danej sesji
 * na podstawie liczby kortów, godzin i limitu per sport.
 */
export function getMaxMulti(sport: string, courtCount: number, durationHours: number): number {
  return courtCount * durationHours * getMultisportPerCourtHour(sport);
}

/** Ile kart Multisport honoruje obiekt na 1 kort przez 1 godzinę w danym sporcie. */
export function getMultisportPerCourtHour(sport: string): number {
  return MULTISPORT_PER_COURT_HOUR[sport] ?? MULTISPORT_PER_COURT_HOUR[SPORT.PINGPONG];
}

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

/** Wynik podziału samej części za kort (bez rakiet), w groszach. */
interface CourtSplit {
  court: Map<string, number>;
  unallocatedGrosze: number;
  discountCapped: boolean;
  multiCapped: boolean;
  maxMulti: number;
  effectiveCards: number;
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
/**
 * Zniżki wynikające z reguł: ile odbić zadziałało i ile groszy przypada każdemu
 * odbijającemu. Wspólne dla podziału kosztów i dla `getExpectedRefund`, żeby
 * „oczekiwany zwrot" nie miał własnej, rozjeżdżającej się pętli.
 */
function computeScanCredits(parsed: ParsedSession) {
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

function splitCourtPerScan(parsed: ParsedSession, courtGrosze: number): CourtSplit {
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

/**
 * Dawna zasada (sesje bez `discountModel`): każda karta daje posiadaczowi
 * jedno 15 zł, a zniżki z kolejnych godzin obniżają cenę wszystkim po równo.
 * Zostaje bez zmian, żeby salda ze starych sesji się nie przesunęły.
 */
function splitCourtLegacy(parsed: ParsedSession, courtGrosze: number): CourtSplit {
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

/** Grupa graczy płacących w tej sesji tę samą stawkę. */
export type CardKind = 'none' | 'multi' | 'single';

/**
 * Jaką kartę gracz miał w sesji. Medicover liczy się osobno tylko przy zasadzie
 * `perScan` — w starych sesjach płacił tyle co Multisport, więc nim jest.
 */
function cardKindOf(parsed: ParsedSession, name: string): CardKind {
  if (!parsed.multi.includes(name)) return 'none';
  return parsed.discountModel === 'perScan' && parsed.singleScan.includes(name) ? 'single' : 'multi';
}

/**
 * Zwrot za karty, jakiego spodziewamy się wg reguł (zł): zadziałane odbicia ×
 * zniżka. Tylko dla zasady `perScan` — to ona liczy odbicia godzina po godzinie.
 * Przy starszej zasadzie zwraca 0.
 */
export function getExpectedRefund(session: SessionLike): number {
  const parsed = parseSession({ ...session, discountModel: 'perScan' });
  return toZloty(computeScanCredits(parsed).effectiveScans * toGrosze(MULTISPORT_DISCOUNT));
}

/** Faktyczny zwrot (cena przed zwrotem − kort po zwrocie) w zł albo `null`, gdy sesja go nie zna. */
export function getCourtRefund(session: SessionLike): number | null {
  const parsed = parseSession(session);
  if (parsed.courtGrossGrosze === undefined) return null;
  return toZloty(parsed.courtGrossGrosze - (parsed.totalGrosze - parsed.racketGrosze));
}

/** Rodzaj karty gracza w danej sesji — ta sama reguła co w podziale kosztów. */
export function getPlayerCard(session: SessionLike, name: string): CardKind {
  return cardKindOf(parseSession(session), name);
}

export interface ShareGroup {
  names: string[];
  hasCard: boolean;
  /** Rodzaj karty: bez, Multisport (co godzinę) albo jednorazowa (Medicover). */
  card: CardKind;
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
