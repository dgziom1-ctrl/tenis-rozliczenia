// Podział kosztów sesji dla powiadomień push.
//
// To port `frontend/src/utils/money.ts` + `frontend/src/utils/sessionCost.ts`.
// Cloud Functions to osobny pakiet (CommonJS, bez TypeScriptu), więc nie może
// zaimportować tamtych modułów bezpośrednio. Zgodność obu implementacji pilnuje
// test `frontend/src/__tests__/functionsParity.test.js` — jeśli zmieniasz
// zasady rozliczeń, zmień OBA pliki, inaczej test padnie.

const GROSZE_PER_ZLOTY = 100;
const MULTISPORT_DISCOUNT = 15;
const RACKET_RENTAL_SPORTS = new Set(['squash', 'badminton', 'padel']);

function hasRacketRental(sport) {
  return RACKET_RENTAL_SPORTS.has(sport);
}

/** Zaokrąglenie „w połowie od zera", odporne na szum IEEE-754 (patrz money.ts). */
function roundHalfAwayFromZero(value) {
  const magnitude = Math.round(Number(Math.abs(value).toPrecision(12)));
  if (magnitude === 0) return 0;
  return value < 0 ? -magnitude : magnitude;
}

function toGrosze(zloty) {
  if (!Number.isFinite(zloty)) return 0;
  return roundHalfAwayFromZero(zloty * GROSZE_PER_ZLOTY);
}

function toZloty(grosze) {
  return grosze / GROSZE_PER_ZLOTY;
}

/** Rozdziela dokładnie `totalGrosze` metodą największych reszt. */
function allocateExact(targets, totalGrosze) {
  const count = targets.length;
  if (count === 0) return [];

  const safeTotal = Number.isFinite(totalGrosze) ? Math.round(totalGrosze) : 0;
  const safeTargets = targets.map(t => (Number.isFinite(t) ? t : 0));

  const result = safeTargets.map(t => Math.floor(t));
  const remainder = safeTotal - result.reduce((sum, v) => sum + v, 0);

  const byFraction = safeTargets
    .map((t, index) => ({ index, fraction: t - Math.floor(t) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  // Reszta rozdawana hurtem, nie po jednym groszu — patrz money.ts.
  const fullRounds = Math.trunc(remainder / count);
  if (fullRounds !== 0) {
    for (let i = 0; i < count; i++) result[i] += fullRounds;
  }

  let leftover = remainder - fullRounds * count;
  const step = leftover >= 0 ? 1 : -1;
  for (let k = 0; leftover !== 0; k++) {
    result[byFraction[k].index] += step;
    leftover -= step;
  }

  return result;
}

function splitEqually(totalGrosze, count) {
  if (count <= 0) return [];
  return allocateExact(new Array(count).fill(totalGrosze / count), totalGrosze);
}

function allocateNonNegative(targets, totalGrosze) {
  const count = targets.length;
  if (count === 0) return [];

  const safeTotal = Number.isFinite(totalGrosze) ? Math.round(totalGrosze) : 0;
  const safeTargets = targets.map(t => (Number.isFinite(t) ? t : 0));

  // Bez dodatniej wagi nie ma proporcji — dzielimy po równo, żeby kwota
  // nie wyparowała z rozliczenia (patrz money.ts).
  if (safeTotal <= 0 || safeTargets.every(t => t <= 0)) {
    return splitEqually(safeTotal, count);
  }

  const eligible = safeTargets.map(t => t > 0);
  for (let guard = 0; guard <= count; guard++) {
    const activeIndexes = safeTargets.map((_, i) => i).filter(i => eligible[i]);
    if (activeIndexes.length === 0) return splitEqually(safeTotal, count);

    const activeTargets = activeIndexes.map(i => safeTargets[i]);
    const activeSum = activeTargets.reduce((sum, t) => sum + t, 0);
    const scale = activeSum > 0 ? safeTotal / activeSum : 0;
    const scaled = activeTargets.map(t => t * scale);

    const allocated = allocateExact(scaled, safeTotal);
    const negativeAt = allocated.findIndex(v => v < 0);
    if (negativeAt === -1) {
      const result = new Array(count).fill(0);
      activeIndexes.forEach((originalIndex, i) => { result[originalIndex] = allocated[i]; });
      return result;
    }
    eligible[activeIndexes[negativeAt]] = false;
  }

  return splitEqually(safeTotal, count);
}

/** Imiona bez duplikatów i pustych wpisów — patrz sessionCost.ts. */
function uniqueNames(names) {
  if (!Array.isArray(names)) return [];
  const seen = new Set();
  for (const name of names) {
    if (typeof name === 'string' && name.length > 0) seen.add(name);
  }
  return [...seen];
}

function parseSession(session) {
  const present = uniqueNames(session.presentPlayers || session.present);
  // `overtimeCost` to zaszłość po usuniętej dogrywce — patrz sessionCost.ts.
  const totalGrosze = Math.max(0, toGrosze(session.totalCost ?? session.cost ?? 0))
    + Math.max(0, toGrosze(session.overtimeCost ?? 0));
  const racketGrosze = Math.min(Math.max(0, toGrosze(session.racketCost ?? 0)), totalGrosze);

  return {
    present,
    multi: uniqueNames(session.multisportPlayers || session.multiPlayers),
    totalGrosze,
    racketGrosze,
    ownRacket: uniqueNames(session.ownRacketPlayers),
  };
}

/**
 * Jedyne źródło prawdy dla podziału kosztów po stronie Cloud Functions.
 * Zwraca kwoty w złotych, identyczne z tym, co pokazuje aplikacja.
 */
function getSessionShares(session) {
  if (!session || typeof session !== 'object') {
    return { byPlayer: {}, baseCourt: 0, baseCourtMulti: 0, discountCapped: false, unallocated: 0 };
  }

  const { present, multi, totalGrosze, racketGrosze, ownRacket } = parseSession(session);

  const court = new Map();
  const racket = new Map();
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
    // Gdy zniżka jest większa niż udział, `allocateNonNegative` zeruje takiego
    // gracza i rozdziela resztę na pozostałych — patrz sessionCost.ts.
    const allocated = allocateNonNegative(targets, courtGrosze);
    present.forEach((p, i) => court.set(p, allocated[i]));
  }

  if (renters.length === 0) {
    unallocatedGrosze += racketGrosze;
  } else {
    const allocated = splitEqually(racketGrosze, renters.length);
    renters.forEach((p, i) => racket.set(p, allocated[i]));
  }

  const byPlayer = {};
  for (const name of present) {
    const courtPart = court.get(name) || 0;
    const racketPart = racket.get(name) || 0;
    byPlayer[name] = {
      court: toZloty(courtPart),
      racket: toZloty(racketPart),
      total: toZloty(courtPart + racketPart),
    };
  }

  // Stawki poglądowe biorą się z gotowego podziału — patrz sessionCost.ts.
  const shareOf = name => (court.get(name) || 0) + (racket.get(name) || 0);
  const average = names => names.reduce((sum, n) => sum + shareOf(n), 0) / names.length;
  const withCard = present.filter(p => multi.includes(p));
  const withoutCard = present.filter(p => !multi.includes(p));

  const baseCourtGrosze = withoutCard.length > 0
    ? average(withoutCard)
    : (withCard.length > 0 ? average(withCard) : 0);

  return {
    byPlayer,
    baseCourt: toZloty(Math.round(baseCourtGrosze)),
    baseCourtMulti: toZloty(Math.round(withCard.length > 0 ? average(withCard) : baseCourtGrosze)),
    discountCapped,
    unallocated: toZloty(unallocatedGrosze),
  };
}

module.exports = {
  MULTISPORT_DISCOUNT,
  hasRacketRental,
  toGrosze,
  toZloty,
  allocateExact,
  splitEqually,
  allocateNonNegative,
  getSessionShares,
};
