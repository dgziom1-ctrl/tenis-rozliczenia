import { calculateDebt, roundToTwoDecimals, getPayingPlayers } from '@/utils/debt';
import { ORGANIZER_NAME, SPORT, SQUASH_MULTISPORT_DISCOUNT } from '@/constants';
import type { Week, NormalizedData } from '@/types/domain';
import type { PlayerStats, HistoryEntry, Summary, UIData } from '@/types/ui';

function buildPlayerStats(
  playerName: string,
  weeks: Week[],
  playerJoinWeek: Record<string, number>,
  paidUntilWeek: Record<string, string>,
  payments: Record<string, { id: string; amount: number; date: string }[]>,
): PlayerStats {
  const joinedAt = playerJoinWeek?.[playerName] ?? 0;
  const playerWeeks = weeks.slice(joinedAt);
  const attendanceCount = playerWeeks.filter(w =>
    (w.present || []).includes(playerName),
  ).length;
  const currentDebt = calculateDebt(playerName, { weeks, paidUntilWeek, payments });
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
    const sport = w.sport || SPORT.PINGPONG;
    let costPerPerson: number;
    let costPerPersonMulti: number;

    const racketCost = w.racketCost ?? 0;
    const ownRacket = w.ownRacketPlayers ?? [];
    const overtimePlayers = w.overtimePlayers ?? [];
    const overtimeCost = w.overtimeCost ?? 0;
    const overtimePerPerson = overtimeCost > 0 && overtimePlayers.length > 0
      ? roundToTwoDecimals(overtimeCost / overtimePlayers.length)
      : 0;

    if (sport === SPORT.SQUASH) {
      const present = w.present || [];
      const multi = w.multiPlayers || [];
      const courtCost = w.cost - racketCost;
      const multiCount = multi.filter(p => present.includes(p)).length;
      const hypothetical = courtCost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
      const base = present.length > 0 ? hypothetical / present.length : 0;
      const courtBase = roundToTwoDecimals(base);
      const courtMulti = roundToTwoDecimals(Math.max(0, base - SQUASH_MULTISPORT_DISCOUNT));

      const rentingPlayers = present.filter(p => !ownRacket.includes(p));
      const racketShare = rentingPlayers.length > 0 ? roundToTwoDecimals(racketCost / rentingPlayers.length) : 0;

      costPerPerson = roundToTwoDecimals(courtBase + racketShare);
      costPerPersonMulti = roundToTwoDecimals(courtMulti + racketShare);
    } else {
      const payers = getPayingPlayers(w.present || [], w.multiPlayers || []);
      costPerPerson = payers.length > 0 ? roundToTwoDecimals(w.cost / payers.length) : 0;
      costPerPersonMulti = 0;
    }

    return {
      id: w.id,
      datePlayed: w.date,
      totalCost: w.cost,
      sport,
      costPerPerson,
      costPerPersonMulti,
      presentPlayers: w.present || [],
      multisportPlayers: w.multiPlayers || [],
      racketCost: racketCost > 0 ? racketCost : undefined,
      ownRacketPlayers: ownRacket.length > 0 ? ownRacket : undefined,
      overtimePlayers: overtimePlayers.length > 0 ? overtimePlayers : undefined,
      overtimeCost: overtimeCost > 0 ? overtimeCost : undefined,
      overtimePerPerson: overtimePerPerson > 0 ? overtimePerPerson : undefined,
    };
  });
}

export function buildUIData(rawData: NormalizedData): UIData {
  const {
    players = [],
    weeks = [],
    playerJoinWeek = {},
    paidUntilWeek = {},
    defaultMultiPlayers = [],
    deletedPlayers = [],
    payments = {},
  } = rawData;

  const playerStats = players
    .map(name => buildPlayerStats(name, weeks, playerJoinWeek, paidUntilWeek, payments))
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
    paidUntilWeek,
    payments,
  };
}

export function normalizeRawData(rawData: Partial<NormalizedData>): NormalizedData {
  return {
    players: rawData.players || [],
    weeks: rawData.weeks || [],
    paidUntilWeek: rawData.paidUntilWeek || {},
    defaultMultiPlayers: rawData.defaultMultiPlayers || [],
    playerJoinWeek: rawData.playerJoinWeek || {},
    deletedPlayers: rawData.deletedPlayers || [],
    payments: rawData.payments || {},
  };
}
