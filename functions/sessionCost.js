// Podział kosztów sesji dla powiadomień push.
//
// To port `frontend/src/utils/money.ts` + `frontend/src/utils/sessionCost.ts`.
// Cloud Functions to osobny pakiet (CommonJS, bez TypeScriptu), więc nie może
// zaimportować tamtych modułów bezpośrednio. Zgodność obu implementacji pilnuje
// test `frontend/src/__tests__/functionsParity.test.js` — jeśli zmieniasz
// zasady rozliczeń, zmień OBA pliki, inaczej test padnie.

const GROSZE_PER_ZLOTY = 100;
const SQUASH_MULTISPORT_DISCOUNT = 15;
const COURT_SPORTS = new Set(['squash', 'badminton']);

function isCourtSport(sport) {
  return COURT_SPORTS.has(sport);
}

function toGrosze(zloty) {
  if (!Number.isFinite(zloty)) return 0;
  return Math.round(zloty * GROSZE_PER_ZLOTY);
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
  let remainder = safeTotal - result.reduce((sum, v) => sum + v, 0);

  const byFraction = safeTargets
    .map((t, index) => ({ index, fraction: t - Math.floor(t) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const step = remainder >= 0 ? 1 : -1;
  for (let k = 0; remainder !== 0; k++) {
    result[byFraction[k % count].index] += step;
    remainder -= step;
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

  const eligible = targets.map(t => t > 0);
  for (let guard = 0; guard <= count; guard++) {
    const activeIndexes = targets.map((_, i) => i).filter(i => eligible[i]);
    if (activeIndexes.length === 0) return new Array(count).fill(0);

    const activeTargets = activeIndexes.map(i => targets[i]);
    const activeSum = activeTargets.reduce((sum, t) => sum + t, 0);
    const scale = activeSum > 0 ? totalGrosze / activeSum : 0;
    const scaled = activeTargets.map(t => t * scale);

    const allocated = allocateExact(scaled, totalGrosze);
    const negativeAt = allocated.findIndex(v => v < 0);
    if (negativeAt === -1) {
      const result = new Array(count).fill(0);
      activeIndexes.forEach((originalIndex, i) => { result[originalIndex] = allocated[i]; });
      return result;
    }
    eligible[activeIndexes[negativeAt]] = false;
  }

  return new Array(count).fill(0);
}

function parseSession(session) {
  const present = session.presentPlayers || session.present || [];
  const totalGrosze = Math.max(0, toGrosze(session.totalCost != null ? session.totalCost : session.cost || 0));
  const racketGrosze = Math.min(Math.max(0, toGrosze(session.racketCost || 0)), totalGrosze);

  return {
    present,
    multi: session.multisportPlayers || session.multiPlayers || [],
    totalGrosze,
    sport: session.sport || 'pingpong',
    racketGrosze,
    ownRacket: session.ownRacketPlayers || [],
    overtimeParticipants: (session.overtimePlayers || []).filter(p => present.includes(p)),
    overtimeGrosze: Math.max(0, toGrosze(session.overtimeCost || 0)),
  };
}

/**
 * Jedyne źródło prawdy dla podziału kosztów po stronie Cloud Functions.
 * Zwraca kwoty w złotych, identyczne z tym, co pokazuje aplikacja.
 */
function getSessionShares(session) {
  if (!session || typeof session !== 'object') {
    return { byPlayer: {}, baseCourt: 0, baseCourtMulti: 0, overtimePerPerson: 0, unallocated: 0 };
  }

  const {
    present, multi, totalGrosze, sport, racketGrosze,
    ownRacket, overtimeParticipants, overtimeGrosze,
  } = parseSession(session);

  const court = new Map();
  const racket = new Map();
  const overtime = new Map();
  let unallocatedGrosze = 0;

  const discount = toGrosze(SQUASH_MULTISPORT_DISCOUNT);
  let baseCourtGrosze = 0;
  let baseCourtMultiGrosze = 0;

  if (isCourtSport(sport)) {
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
  } else {
    const paying = present.filter(p => !multi.includes(p));
    if (paying.length === 0) {
      unallocatedGrosze += totalGrosze;
    } else {
      const allocated = splitEqually(totalGrosze, paying.length);
      paying.forEach((p, i) => court.set(p, allocated[i]));
      baseCourtGrosze = Math.round(totalGrosze / paying.length);
    }
  }

  let overtimePerPersonGrosze = 0;
  if (overtimeGrosze > 0) {
    if (overtimeParticipants.length === 0) {
      unallocatedGrosze += overtimeGrosze;
    } else {
      const allocated = splitEqually(overtimeGrosze, overtimeParticipants.length);
      overtimeParticipants.forEach((p, i) => overtime.set(p, allocated[i]));
      overtimePerPersonGrosze = allocated[0];
    }
  }

  const byPlayer = {};
  for (const name of present) {
    const courtPart = court.get(name) || 0;
    const racketPart = racket.get(name) || 0;
    const overtimePart = overtime.get(name) || 0;
    byPlayer[name] = {
      court: toZloty(courtPart),
      racket: toZloty(racketPart),
      overtime: toZloty(overtimePart),
      total: toZloty(courtPart + racketPart + overtimePart),
    };
  }

  return {
    byPlayer,
    baseCourt: toZloty(baseCourtGrosze),
    baseCourtMulti: toZloty(baseCourtMultiGrosze),
    overtimePerPerson: toZloty(overtimePerPersonGrosze),
    unallocated: toZloty(unallocatedGrosze),
  };
}

module.exports = {
  SQUASH_MULTISPORT_DISCOUNT,
  isCourtSport,
  toGrosze,
  toZloty,
  allocateExact,
  splitEqually,
  allocateNonNegative,
  getSessionShares,
};
