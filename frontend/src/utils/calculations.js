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

  // ALL sessions the player was charged for — before and after any cutoff.
  // We always show the full picture so the breakdown is never incomplete.
  const sessions = chronological.filter(sessionFilter).map(sessionMap);

  let playerPayments = (payments?.[player.name] || []).map(p => ({
    date:   p.date,
    amount: p.amount,
    id:     p.id,
  }));

  // Legacy fallback: paidUntilWeek is set (old "Rozlicz" button) but no
  // __legacy_settled__ synthetic entry exists yet. Add it even when the player
  // has real cash payments — otherwise those payments are shown but the settled
  // amount is invisible, making the balance look wrong (e.g. shows 40 zł owed
  // instead of 0 after player paid the remaining 9 zł on top of a prior settlement).
  if (cutoffIdx >= 0 && !playerPayments.some(p => p.id === '__legacy_settled__')) {
    const settledCost = roundToTwoDecimals(
      chronological.slice(0, cutoffIdx + 1).filter(sessionFilter)
        .reduce((s, x) => s + x.costPerPerson, 0),
    );
    const settlementDate = chronological[cutoffIdx]?.datePlayed ?? null;

    if (settledCost > 0) {
      // Prepend the synthetic settlement — real cash payments come after it chronologically
      playerPayments = [
        {
          id:     '__legacy_settled__',
          amount: settledCost,
          date:   settlementDate,
        },
        ...playerPayments,
      ];
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

// ─── Achievements ─────────────────────────────────────────────────────────────
// Dynamic streak milestones — every multiple of 5 up to player's max streak
const STREAK_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];

const STATIC_ACHIEVEMENTS = [
  {
    id: 'first_session',
    label: 'Debiut',
    desc: 'Pierwsza sesja',
    emoji: '🎮',
    check: (player, history) => history.some(s => s.presentPlayers.includes(player.name)),
  },
  {
    id: 'perfect_month',
    label: 'Perfekcyjny miesiąc',
    desc: '100% w jednym miesiącu (min. 3 sesje)',
    emoji: '💎',
    check: (player, history) => {
      const months = {};
      history.forEach(s => {
        const key = s.datePlayed?.slice(0, 7);
        if (!key) return;
        if (!months[key]) months[key] = { total: 0, present: 0 };
        months[key].total++;
        if (s.presentPlayers.includes(player.name)) months[key].present++;
      });
      return Object.values(months).some(m => m.total >= 3 && m.present === m.total);
    },
  },
  {
    id: 'sessions_10',
    label: '10 sesji',
    desc: 'Łącznie 10 sesji na koncie',
    emoji: '🏅',
    check: (player) => (player.attendanceCount || 0) >= 10,
  },
  {
    id: 'sessions_25',
    label: '25 sesji',
    desc: 'Łącznie 25 sesji na koncie',
    emoji: '🥈',
    check: (player) => (player.attendanceCount || 0) >= 25,
  },
  {
    id: 'sessions_50',
    label: '50 sesji',
    desc: 'Łącznie 50 sesji na koncie',
    emoji: '🏆',
    check: (player) => (player.attendanceCount || 0) >= 50,
  },
  {
    id: 'multisport_5',
    label: 'Multisport x5',
    desc: '5 sesji z kartą Multisport',
    emoji: '💳',
    check: (player) => (player.multisportCount || 0) >= 5,
  },
];

export function getPlayerAchievements(player, history) {
  const earned = [];

  // Static achievements
  for (const ach of STATIC_ACHIEVEMENTS) {
    if (ach.check(player, history)) {
      earned.push({ id: ach.id, label: ach.label, desc: ach.desc, emoji: ach.emoji });
    }
  }

  // Dynamic streak milestones — compute longest streak from history
  let maxStreak = 0, cur = 0;
  for (const s of [...history].reverse()) {
    if (s.presentPlayers.includes(player.name)) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }
  for (const milestone of STREAK_MILESTONES) {
    if (maxStreak >= milestone) {
      earned.push({
        id: `streak_${milestone}`,
        label: `Seria ${milestone}`,
        desc: `${milestone} sesji z rzędu`,
        emoji: milestone >= 20 ? '🔥' : '⚡',
      });
    }
  }

  return earned;
}

// ─── Ranking history — computed from session data ─────────────────────────────
// Returns array of { month, rankings: [{name, pct, place}] } oldest→newest
export function computeRankingHistory(players, history) {
  if (!history || history.length === 0 || !players || players.length === 0) return [];

  // Get all months in chronological order
  const monthSet = new Set();
  history.forEach(s => { if (s.datePlayed) monthSet.add(s.datePlayed.slice(0, 7)); });
  const months = [...monthSet].sort();

  const playerNames = players.map(p => p.name);

  return months.map(month => {
    // All sessions UP TO and including this month
    const sessionsUpTo = history.filter(s => s.datePlayed?.slice(0, 7) <= month);
    const total = sessionsUpTo.length;
    if (total === 0) return null;

    const stats = playerNames.map(name => {
      const attended = sessionsUpTo.filter(s => s.presentPlayers.includes(name)).length;
      const pct = Math.round((attended / total) * 100);
      return { name, pct, attended };
    });

    // Sort and assign places
    stats.sort((a, b) => b.pct - a.pct || b.attended - a.attended);
    let place = 1;
    const rankings = stats.map((p, i) => {
      if (i > 0 && p.pct < stats[i - 1].pct) place = i + 1;
      return { ...p, place };
    });

    return { month, rankings };
  }).filter(Boolean);
}
