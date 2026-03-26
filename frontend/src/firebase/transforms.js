import { calculateDebt, roundToTwoDecimals, getPayingPlayers } from '../utils/calculations';
import { ORGANIZER_NAME, SPORT, SQUASH_MULTISPORT_DISCOUNT } from '../constants';

// ─── Private helpers ─────────────────────────────────────────────────────────

function buildPlayerStats(playerName, weeks, playerJoinWeek, paidUntilWeek, payments) {
  const joinedAt = playerJoinWeek?.[playerName] ?? 0;
  const playerWeeks = weeks.slice(joinedAt);
  const attendanceCount = playerWeeks.filter(w =>
    (w.present || []).includes(playerName)
  ).length;
  const currentDebt = calculateDebt(playerName, { weeks, paidUntilWeek, payments });

  return { name: playerName, attendanceCount, currentDebt };
}

function buildSummary(playerStats, weeksLength) {
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

function buildHistory(weeks) {
  return [...weeks].reverse().map(w => {
    const sport = w.sport || SPORT.PINGPONG;

    let costPerPerson;
    let costPerPersonMulti;

    if (sport === SPORT.SQUASH) {
      // Squash: everyone splits the rental cost; multisport holders get a personal -15 zł discount.
      const base      = w.present?.length > 0 ? w.cost / w.present.length : 0;
      costPerPerson      = roundToTwoDecimals(base);
      costPerPersonMulti = roundToTwoDecimals(Math.max(0, base - SQUASH_MULTISPORT_DISCOUNT));
    } else {
      // Ping-pong: multisport players pay 0; remaining players split the cost.
      const payers   = getPayingPlayers(w.present || [], w.multiPlayers || []);
      costPerPerson  = payers.length > 0 ? roundToTwoDecimals(w.cost / payers.length) : 0;
      costPerPersonMulti = 0;
    }

    return {
      id:                w.id,
      datePlayed:        w.date,
      totalCost:         w.cost,
      sport,
      costPerPerson,
      costPerPersonMulti,
      presentPlayers:    w.present    || [],
      multisportPlayers: w.multiPlayers || [],
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildUIData(rawData) {
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

export function normalizeRawData(rawData) {
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
