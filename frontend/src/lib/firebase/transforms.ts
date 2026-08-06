import { calculateDebt, roundToTwoDecimals } from '@/utils/debt';
import { getSessionShares } from '@/utils/sessionCost';
import { ORGANIZER_NAME, SPORT } from '@/constants';
import type { Week, NormalizedData } from '@/types/domain';
import type { PlayerStats, HistoryEntry, Summary, UIData } from '@/types/ui';

function buildPlayerStats(
  playerName: string,
  weeks: Week[],
  playerJoinWeek: Record<string, number>,
  payments: Record<string, { id: string; amount: number; date: string }[]>,
): PlayerStats {
  const joinedAt = playerJoinWeek?.[playerName] ?? 0;
  const playerWeeks = weeks.slice(joinedAt);
  const attendanceCount = playerWeeks.filter(w =>
    (w.present || []).includes(playerName),
  ).length;
  const currentDebt = calculateDebt(playerName, { weeks, payments });
  return { name: playerName, attendanceCount, currentDebt };
}

function buildSummary(playerStats: PlayerStats[], weeksLength: number): Summary {
  const nonOrgPlayers = playerStats.filter(p => p.name !== ORGANIZER_NAME);
  const totalToCollect = nonOrgPlayers.reduce((sum, p) => sum + p.currentDebt, 0);
  const settledCount = nonOrgPlayers.filter(p => p.currentDebt <= 0.01).length;
  return {
    totalToCollect: roundToTwoDecimals(totalToCollect),
    settledPlayers: settledCount,
    totalPlayers: nonOrgPlayers.length,
    totalWeeks: weeksLength,
  };
}

function buildHistory(weeks: Week[]): HistoryEntry[] {
  return [...weeks].reverse().map(w => {
    // Kwoty biorą się z tego samego podziału, którego używa saldo gracza,
    // więc historia i rozliczenie nie mogą się rozjechać.
    const shares = getSessionShares(w);
    const racketCost = w.racketCost ?? 0;
    const ownRacket = w.ownRacketPlayers ?? [];
    const overtimePlayers = w.overtimePlayers ?? [];
    const overtimeCost = w.overtimeCost ?? 0;

    return {
      id: w.id,
      datePlayed: w.date,
      totalCost: w.cost,
      sport: w.sport || SPORT.PINGPONG,
      costPerPerson: shares.baseCourt,
      costPerPersonMulti: shares.baseCourtMulti,
      presentPlayers: w.present || [],
      multisportPlayers: w.multiPlayers || [],
      racketCost: racketCost > 0 ? racketCost : undefined,
      ownRacketPlayers: ownRacket.length > 0 ? ownRacket : undefined,
      overtimePlayers: overtimePlayers.length > 0 ? overtimePlayers : undefined,
      overtimeCost: overtimeCost > 0 ? overtimeCost : undefined,
      overtimePerPerson: shares.overtimePerPerson > 0 ? shares.overtimePerPerson : undefined,
    };
  });
}

/** Sortuje sesje chronologicznie po dacie (rosnąco), stabilnie po id przy równych datach. */
export function sortWeeksByDate(weeks: Week[]): Week[] {
  return [...(weeks || [])].sort((a, b) => {
    const byDate = String(a?.date ?? '').localeCompare(String(b?.date ?? ''));
    return byDate !== 0 ? byDate : String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

export function buildUIData(rawData: NormalizedData): UIData {
  const {
    players = [],
    weeks = [],
    playerJoinWeek = {},
    defaultMultiPlayers = [],
    deletedPlayers = [],
    payments = {},
  } = rawData;

  const playerStats = players
    .map(name => buildPlayerStats(name, weeks, playerJoinWeek, payments))
    .sort((a, b) => b.currentDebt - a.currentDebt || a.name.localeCompare(b.name, 'pl'));

  // ── Skarbnik logic ──────────────────────────────────────────────────────────
  // Kamil fronts 100% of every session at the reception.
  // His "do odzyskania" = sum of what everyone else still owes.
  // Stored as negative currentDebt → hasCredit=true → green display in PlayerCard.
  const totalOwed = roundToTwoDecimals(
    playerStats
      .filter(p => p.name !== ORGANIZER_NAME)
      .reduce((sum, p) => sum + p.currentDebt, 0),
  );
  const treasurer = playerStats.find(p => p.name === ORGANIZER_NAME);
  if (treasurer) {
    // Pełne saldo bez clampowania: jeśli nadpłaty przewyższają zaległości,
    // currentDebt > 0 → isPending=true → PersonCard pokazuje stan "saldo" zamiast "wszyscy rozliczeni".
    treasurer.currentDebt = roundToTwoDecimals(-totalOwed);
  }

  return {
    summary: buildSummary(playerStats, weeks.length),
    players: playerStats,
    playerNames: players,
    defaultMultiPlayers,
    deletedPlayers,
    history: buildHistory(weeks),
    payments,
  };
}

export function normalizeRawData(rawData: Partial<NormalizedData>): NormalizedData {
  // Sesje zawsze porządkujemy chronologicznie po dacie (rosnąco). Dzięki temu
  // sesja dodana z datą wsteczną nie psuje historii, wykresów ani kursora rozliczeń
  // (kolejność w tablicy przestaje zależeć od momentu wpisania sesji).
  return {
    players: rawData.players || [],
    weeks: sortWeeksByDate(rawData.weeks || []),
    defaultMultiPlayers: rawData.defaultMultiPlayers || [],
    playerJoinWeek: rawData.playerJoinWeek || {},
    deletedPlayers: rawData.deletedPlayers || [],
    payments: rawData.payments || {},
  };
}
