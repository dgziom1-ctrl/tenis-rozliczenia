import { onValue, set } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { calculateDebt, roundToTwoDecimals } from '../utils/calculations';
import { ORGANIZER_NAME } from '../constants';

// ─── Transformations ────────────────────────────────────────────────────────

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
    const payers = (w.present || []).filter(p => !(w.multiPlayers || []).includes(p));
    const costPerPerson = payers.length > 0 ? w.cost / payers.length : 0;

    return {
      id: w.id,
      datePlayed: w.date,
      totalCost: w.cost,
      costPerPerson: roundToTwoDecimals(costPerPerson),
      presentPlayers: w.present || [],
      multisportPlayers: w.multiPlayers || [],
    };
  });
}

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

// ─── Subscription ────────────────────────────────────────────────────────────

export function subscribeToData(callback) {
  return onValue(dataRef, (snapshot) => {
    const rawData = snapshot.val() || {};
    const normalized = {
      players: rawData.players || [],
      weeks: rawData.weeks || [],
      paidUntilWeek: rawData.paidUntilWeek || {},
      defaultMultiPlayers: rawData.defaultMultiPlayers || [],
      playerJoinWeek: rawData.playerJoinWeek || {},
      deletedPlayers: rawData.deletedPlayers || [],
      payments: rawData.payments || {},
    };
    setCurrentData(normalized);
    callback(buildUIData(normalized));
  });
}

// ─── Save helper ─────────────────────────────────────────────────────────────

export function saveData(data) {
  return set(dataRef, data);
}
