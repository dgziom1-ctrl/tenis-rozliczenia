// ============================================================================
// WRAPPED — Annual summary stats computation
// ============================================================================

import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '../constants';
import { getPlayerSessionCost } from './sessionCost';

/**
 * Compute all stats needed for the annual "Wrapped" summary.
 *
 * @param {Array} history — full history array (will be filtered to year)
 * @param {Array} players — all players
 * @param {number} year — calendar year (e.g. 2025)
 * @returns {Object|null} wrapped stats or null if no data
 */
export function computeWrappedStats(history, players, year) {
  const prefix = String(year);
  const yearHistory = history.filter(s => s.datePlayed?.startsWith(prefix));

  if (yearHistory.length === 0) return null;

  const totalSessions = yearHistory.length;
  const playerNames = players?.map(p => p.name) || [];

  // --- Per-player stats ---
  const perPlayer = playerNames.map(name => {
    const attended = yearHistory.filter(s => s.presentPlayers.includes(name));
    const missed = totalSessions - attended.length;
    const totalCost = attended.reduce((sum, s) => sum + getPlayerSessionCost(s, name), 0);
    const avgCost = attended.length > 0 ? totalCost / attended.length : 0;

    // Longest streak in this year
    let maxStreak = 0, cur = 0;
    for (const s of [...yearHistory].reverse()) {
      if (s.presentPlayers.includes(name)) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = 0;
    }

    // Multisport sessions
    const multiSessions = attended.filter(s => s.multisportPlayers.includes(name)).length;

    return {
      name,
      attended: attended.length,
      missed,
      percentage: totalSessions > 0 ? Math.round((attended.length / totalSessions) * 100) : 0,
      totalCost: Math.round(totalCost * 100) / 100,
      avgCost: Math.round(avgCost * 100) / 100,
      longestStreak: maxStreak,
      multiSessions,
    };
  }).filter(p => p.attended > 0);

  // --- Rankings ---
  const sorted = [...perPlayer].sort((a, b) => b.percentage - a.percentage || b.attended - a.attended);
  sorted.forEach((p, i) => { p.place = i + 1; });

  // --- Group stats ---
  const totalCostAll = yearHistory.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  const avgPlayersPerSession = yearHistory.reduce((sum, s) => sum + s.presentPlayers.length, 0) / totalSessions;

  // Sport breakdown
  const squashSessions = yearHistory.filter(s => s.sport === SPORT.SQUASH).length;
  const pingpongSessions = totalSessions - squashSessions;

  // Month with most sessions
  const monthCounts = {};
  yearHistory.forEach(s => {
    const m = s.datePlayed.slice(5, 7);
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });
  const MONTH_NAMES = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];
  const busiestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestMonthName = busiestMonth ? MONTH_NAMES[parseInt(busiestMonth[0], 10) - 1] : null;
  const busiestMonthCount = busiestMonth ? busiestMonth[1] : 0;

  // Most expensive session
  const mostExpensive = [...yearHistory].sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))[0];

  // Most loyal pair (co-attendance)
  let bestPair = null;
  let bestPairCount = 0;
  for (let i = 0; i < perPlayer.length; i++) {
    for (let j = i + 1; j < perPlayer.length; j++) {
      const count = yearHistory.filter(s =>
        s.presentPlayers.includes(perPlayer[i].name) &&
        s.presentPlayers.includes(perPlayer[j].name)
      ).length;
      if (count > bestPairCount) {
        bestPairCount = count;
        bestPair = [perPlayer[i].name, perPlayer[j].name];
      }
    }
  }

  return {
    year,
    totalSessions,
    totalCost: Math.round(totalCostAll * 100) / 100,
    avgPlayersPerSession: Math.round(avgPlayersPerSession * 10) / 10,
    pingpongSessions,
    squashSessions,
    busiestMonthName,
    busiestMonthCount,
    mostExpensiveSession: mostExpensive ? {
      date: mostExpensive.datePlayed,
      cost: mostExpensive.totalCost,
      players: mostExpensive.presentPlayers.length,
    } : null,
    bestPair,
    bestPairCount,
    champion: sorted[0] || null,
    players: sorted,
  };
}
