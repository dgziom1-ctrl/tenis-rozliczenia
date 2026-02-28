// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

import { ORGANIZER_NAME } from '../constants';

const DEBT_EPSILON = 0.05;

export function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

export function calculateDebt(playerName, data) {
  if (playerName === ORGANIZER_NAME) return 0;

  const weeks = data.weeks || [];
  const paidWeekId = data.paidUntilWeek?.[playerName];
  const lastPaidIndex = paidWeekId 
    ? weeks.findIndex(w => w.id === paidWeekId) 
    : -1;

  let debt = 0;
  const startIndex = lastPaidIndex + 1;

  for (let idx = startIndex; idx < weeks.length; idx++) {
    const week = weeks[idx];
    const isPresent = (week.present || []).includes(playerName);
    const isMultisport = (week.multiPlayers || []).includes(playerName);

    if (isPresent && !isMultisport) {
      const payingPlayers = (week.present || []).filter(
        p => !(week.multiPlayers || []).includes(p)
      );
      if (payingPlayers.length > 0) {
        debt += week.cost / payingPlayers.length;
      }
    }
  }

  return roundToTwoDecimals(debt);
}

export function calculateDebtBreakdown(playerName, currentDebt, history) {
  if (currentDebt <= 0 || !history || history.length === 0) {
    return [];
  }

  let accumulated = 0;
  const breakdown = [];

  for (const session of history) {
    const isPresent = session.presentPlayers.includes(playerName);
    const isMultisport = session.multisportPlayers.includes(playerName);

    if (isPresent && !isMultisport) {
      accumulated += session.costPerPerson;
      breakdown.push({
        date: session.datePlayed,
        amount: session.costPerPerson,
        sessionId: session.id,
      });

      if (accumulated >= currentDebt - DEBT_EPSILON) break;
    }
  }

  return breakdown;
}

export function calculatePlayerStats(players, history, totalWeeks) {
  if (!players || !history) return [];

  return players.map(player => {
    const { name, attendanceCount, currentDebt } = player;
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

    const multisportCount = history.filter(s => 
      s.multisportPlayers.includes(name)
    ).length;

    return {
      ...player,
      attendancePercentage,
      currentStreak,
      multisportCount,
    };
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

export function groupSessionsByMonth(history) {
  const months = {};

  history.forEach(session => {
    const monthKey = session.datePlayed.slice(0, 7);

    if (!months[monthKey]) {
      months[monthKey] = { total: 0, players: {} };
    }

    months[monthKey].total += 1;
    session.presentPlayers.forEach(playerName => {
      months[monthKey].players[playerName] = 
        (months[monthKey].players[playerName] || 0) + 1;
    });
  });

  return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
}

export function getSpecialTitle(player, allPlayers) {
  if (!allPlayers || allPlayers.length === 0) return null;

  const maxStreak = Math.max(...allPlayers.map(p => p.currentStreak || 0));
  const maxMulti = Math.max(...allPlayers.map(p => p.multisportCount || 0));
  const maxAttendance = Math.max(...allPlayers.map(p => p.attendanceCount || 0));
  const minAttendance = Math.min(...allPlayers.map(p => p.attendanceCount || 0));

  if (player.currentStreak === maxStreak && maxStreak >= 2) {
    const isUnique = allPlayers.filter(p => p.currentStreak === maxStreak).length === 1;
    if (isUnique) {
      return { icon: '🔥', label: `Seria ${maxStreak}`, color: 'text-orange-400 border-orange-700 bg-orange-950/30' };
    }
  }

  if (player.multisportCount === maxMulti && maxMulti > 0) {
    const isUnique = allPlayers.filter(p => p.multisportCount === maxMulti).length === 1;
    if (isUnique) {
      return { icon: '⚡', label: 'Multi King', color: 'text-emerald-400 border-emerald-700 bg-emerald-950/30' };
    }
  }

  if (player.attendanceCount === maxAttendance) {
    const isUnique = allPlayers.filter(p => p.attendanceCount === maxAttendance).length === 1;
    if (isUnique) {
      return { icon: '👑', label: 'Król frekwencji', color: 'text-yellow-400 border-yellow-700 bg-yellow-950/30' };
    }
  }

  if (player.attendanceCount === minAttendance && player.attendancePercentage < 40) {
    const isUnique = allPlayers.filter(p => p.attendanceCount === minAttendance).length === 1;
    if (isUnique) {
      return { icon: '💀', label: 'Rzadki gość', color: 'text-slate-400 border-slate-700 bg-slate-900/30' };
    }
  }

  return null;
}
