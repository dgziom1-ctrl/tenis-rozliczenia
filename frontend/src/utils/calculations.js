// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

import { ORGANIZER_NAME, MONTHS } from '../constants';

export function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

// ─── Core business rule: who pays for a session ───────────────────────────────
// Present players who don't have Multisport are the paying players.
export function getPayingPlayers(present = [], multisportPlayers = []) {
  return present.filter(p => !multisportPlayers.includes(p));
}

// ─── Base helper: list of sessions a player owes for ─────────────────────────
// Used by both calculateDebt (raw weeks) and calculateDebtBreakdown (UI history).
// Returns [{id, costPerPerson}] oldest→newest for sessions after paidUntilWeekIdx.
function unpaidSessionsFromWeeks(playerName, weeks, paidUntilWeekId) {
  const lastPaidIndex = paidUntilWeekId
    ? weeks.findIndex(w => w.id === paidUntilWeekId)
    : -1;

  const result = [];
  for (let idx = lastPaidIndex + 1; idx < weeks.length; idx++) {
    const week       = weeks[idx];
    const isPresent  = (week.present     || []).includes(playerName);
    const isMulti    = (week.multiPlayers || []).includes(playerName);
    if (isPresent && !isMulti) {
      const paying = getPayingPlayers(week.present || [], week.multiPlayers || []);
      result.push({ id: week.id, costPerPerson: paying.length > 0 ? week.cost / paying.length : 0 });
    }
  }
  return result;
}

// ─── calculateDebt ────────────────────────────────────────────────────────────
// Canonical debt calculation — uses raw Firebase weeks.
// Returns positive = owes money, negative = overpaid (credit).
export function calculateDebt(playerName, data) {
  if (playerName === ORGANIZER_NAME) return 0;

  const sessions    = unpaidSessionsFromWeeks(playerName, data.weeks || [], data.paidUntilWeek?.[playerName]);
  const sessionCost = roundToTwoDecimals(sessions.reduce((sum, s) => sum + s.costPerPerson, 0));
  const totalPaid   = roundToTwoDecimals(
    (data.payments?.[playerName] || []).reduce((sum, p) => sum + (p.amount || 0), 0),
  );

  return roundToTwoDecimals(sessionCost - totalPaid);
}

// ─── calculateDebtBreakdown ───────────────────────────────────────────────────
// Returns the ordered list of sessions (oldest → newest) that explain the
// player's current debt. Uses the UI history (already transformed) and the
// pre-computed debtAmount so the result is always consistent with calculateDebt.
//
// Signature: (playerName, debtAmount, history) → [{sessionId, date, amount}]
export function calculateDebtBreakdown(playerName, debtAmount, history) {
  if (debtAmount <= 0 || !history) return [];

  const chronological = [...history].reverse(); // oldest first
  const sessions = [];
  let accumulated = 0;

  for (const session of chronological) {
    if (accumulated >= debtAmount - 0.001) break;

    const isPresent = session.presentPlayers.includes(playerName);
    const isMulti   = session.multisportPlayers.includes(playerName);

    if (isPresent && !isMulti && session.costPerPerson > 0) {
      sessions.push({
        sessionId: session.id,
        date:      session.datePlayed,
        amount:    session.costPerPerson,
      });
      accumulated = roundToTwoDecimals(accumulated + session.costPerPerson);
    }
  }

  return sessions;
}

// ─── buildDebtDisplayData ────────────────────────────────────────────────────
// Assembles the full breakdown object used by the Dashboard UI.
//
// Normal path: shows sessions after paidUntilWeek cutoff + real payments.
//
// Legacy fallback: old data settled via "Rozlicz" button has paidUntilWeek set
// but payments=[]. In this case we show the settled sessions and synthesise a
// payment dated as the last settled session's date, so the panel is never empty.
export function buildDebtDisplayData(player, history, payments, paidUntilWeek) {
  // history arrives newest-first; reverse to oldest-first for display order
  const chronological = [...history].reverse();

  const paidUntilId = paidUntilWeek?.[player.name];
  const cutoffIdx   = paidUntilId
    ? chronological.findIndex(s => s.id === paidUntilId)
    : -1;

  const sessionFilter = s =>
    s.presentPlayers.includes(player.name) &&
    !s.multisportPlayers.includes(player.name);

  const sessionMap = s => ({
    sessionId: s.id,
    date:      s.datePlayed,
    amount:    s.costPerPerson,
  });

  // Sessions in the current (outstanding) period
  const outstandingSessions = chronological
    .slice(cutoffIdx + 1)
    .filter(sessionFilter)
    .map(sessionMap);

  let playerPayments = (payments?.[player.name] || []).map(p => ({
    date:   p.date,
    amount: p.amount,
    id:     p.id,
  }));

  let sessions = outstandingSessions;

  // Legacy fallback: paidUntilWeek is set but no payments recorded and no new
  // sessions → show the settled period so the panel is never blank.
  const legacySettled =
    cutoffIdx >= 0 &&
    outstandingSessions.length === 0 &&
    playerPayments.length === 0;

  if (legacySettled) {
    sessions = chronological
      .slice(0, cutoffIdx + 1)
      .filter(sessionFilter)
      .map(sessionMap);

    const settledTotal = roundToTwoDecimals(sessions.reduce((s, x) => s + x.amount, 0));
    // Use the date of the paidUntilWeek session as the settlement date
    const settlementDate = chronological[cutoffIdx]?.datePlayed ?? null;

    if (settledTotal > 0) {
      playerPayments = [{
        id:     '__legacy_settled__',
        amount: settledTotal,
        date:   settlementDate,
      }];
    }
  }

  const totalSessions = roundToTwoDecimals(sessions.reduce((s, x) => s + x.amount, 0));
  const totalPaid     = roundToTwoDecimals(playerPayments.reduce((s, p) => s + (p.amount || 0), 0));
  const balance       = roundToTwoDecimals(totalSessions - totalPaid);

  return { sessions, payments: playerPayments, totalSessions, totalPaid, balance };
}

export function calculatePlayerStats(players, history, totalWeeks) {
  if (!players || !history) return [];

  return players.map(player => {
    const { name, attendanceCount } = player;
    const attendancePercentage = totalWeeks > 0
      ? Math.round((attendanceCount / totalWeeks) * 100)
      : 0;

    let currentStreak = 0;
    for (const session of history) {
      if (session.presentPlayers.includes(name)) {
        currentStreak++;
      } else {
        break;
      }
    }

    const multisportCount = history.filter(s => s.multisportPlayers.includes(name)).length;

    return { ...player, attendancePercentage, currentStreak, multisportCount };
  });
}

export function assignRankingPlaces(sortedPlayers) {
  let currentPlace = 1;
  return sortedPlayers.map((player, index) => {
    if (index > 0 && player.attendancePercentage < sortedPlayers[index - 1].attendancePercentage) {
      currentPlace = index + 1;
    }
    return { ...player, place: currentPlace };
  });
}

// ─── Month grouping ───────────────────────────────────────────────────────────

function getMonthLabel(dateStr) {
  const [y, m] = dateStr.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

// Used by AttendanceTab — accumulates per-player session counts per month.
export function groupSessionsByMonth(history) {
  const months = {};
  history.forEach(session => {
    const key = getMonthKey(session.datePlayed);
    if (!months[key]) months[key] = { total: 0, players: {} };
    months[key].total += 1;
    session.presentPlayers.forEach(playerName => {
      months[key].players[playerName] = (months[key].players[playerName] || 0) + 1;
    });
  });
  return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
}

// Used by HistoryTab — groups raw session rows into labelled month buckets.
export function groupHistoryByMonth(history) {
  const groups = [];
  let current = null;
  for (const row of history) {
    const label = getMonthLabel(row.datePlayed);
    if (!current || current.label !== label) {
      current = { label, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
}

// ─── getPlayerBadge ───────────────────────────────────────────────────────────
// Returns a badge descriptor { icon, label, color } for a notable player stat,
// or null if the player has no standout achievement.
export function getPlayerBadge(player, allPlayers) {
  if (!allPlayers || allPlayers.length === 0) return null;

  // Single pass: aggregate extremes AND count holders simultaneously
  const agg = allPlayers.reduce((acc, p) => {
    const streak = p.currentStreak   || 0;
    const multi  = p.multisportCount || 0;
    const att    = p.attendanceCount || 0;
    return {
      maxStreak:        Math.max(acc.maxStreak,     streak),
      maxMulti:         Math.max(acc.maxMulti,      multi),
      maxAttendance:    Math.max(acc.maxAttendance, att),
      minAttendance:    Math.min(acc.minAttendance, p.attendanceCount ?? Infinity),
      streakHolders:    streak === acc.maxStreak ? acc.streakHolders + 1 : streak > acc.maxStreak ? 1 : acc.streakHolders,
      multiHolders:     multi  === acc.maxMulti  ? acc.multiHolders  + 1 : multi  > acc.maxMulti  ? 1 : acc.multiHolders,
      attendHolders:    att    === acc.maxAttendance ? acc.attendHolders + 1 : att > acc.maxAttendance ? 1 : acc.attendHolders,
      minAttHolders:    att    === acc.minAttendance ? acc.minAttHolders + 1 : att < acc.minAttendance ? 1 : acc.minAttHolders,
    };
  }, { maxStreak: 0, maxMulti: 0, maxAttendance: 0, minAttendance: Infinity, streakHolders: 0, multiHolders: 0, attendHolders: 0, minAttHolders: 0 });

  if (player.currentStreak === agg.maxStreak && agg.maxStreak >= 2 && agg.streakHolders === 1)
    return { icon: '🔥', label: `Seria ${agg.maxStreak}`, color: 'text-orange-400 border-orange-700 bg-orange-950/30' };
  if (player.multisportCount === agg.maxMulti && agg.maxMulti > 0 && agg.multiHolders === 1)
    return { icon: '⚡', label: 'Multi King', color: 'text-emerald-400 border-emerald-700 bg-emerald-950/30' };
  if (player.attendanceCount === agg.maxAttendance && agg.attendHolders === 1)
    return { icon: '👑', label: 'Król frekwencji', color: 'text-yellow-400 border-yellow-700 bg-yellow-950/30' };
  if (player.attendanceCount === agg.minAttendance && player.attendancePercentage < 40 && agg.minAttHolders === 1)
    return { icon: '💀', label: 'Rzadki gość', color: 'text-slate-400 border-slate-700 bg-slate-900/30' };

  return null;
}
