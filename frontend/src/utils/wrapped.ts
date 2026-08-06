import { SPORT } from '@/constants';
import type { PlayerStats, HistoryEntry } from '@/types/ui';
import type { WrappedStats, WrappedPlayerStats } from '@/types/ui';

export function computeWrappedStats(
  history: HistoryEntry[],
  players: PlayerStats[],
  year: number,
): WrappedStats | null {
  const prefix = String(year);
  const yearHistory = history.filter(s => s.datePlayed?.startsWith(prefix));
  if (yearHistory.length === 0) return null;

  const totalSessions = yearHistory.length;
  const playerNames = players?.map(p => p.name) || [];

  const perPlayer: WrappedPlayerStats[] = playerNames.map(name => {
    const attended = yearHistory.filter(s => s.presentPlayers.includes(name));
    const missed = totalSessions - attended.length;

    let maxStreak = 0, cur = 0;
    for (const s of [...yearHistory].reverse()) {
      if (s.presentPlayers.includes(name)) { cur++; maxStreak = Math.max(maxStreak, cur); }
      else cur = 0;
    }

    const multiSessions = attended.filter(s => s.multisportPlayers.includes(name)).length;

    return {
      name,
      attended: attended.length,
      missed,
      percentage: totalSessions > 0 ? Math.round((attended.length / totalSessions) * 100) : 0,
      longestStreak: maxStreak,
      multiSessions,
    };
  }).filter(p => p.attended > 0);

  const sorted = [...perPlayer].sort((a, b) => b.percentage - a.percentage || b.attended - a.attended);
  sorted.forEach((p, i) => { p.place = i + 1; });

  const avgPlayersPerSession = yearHistory.reduce((sum, s) => sum + s.presentPlayers.length, 0) / totalSessions;

  const squashSessions = yearHistory.filter(s => s.sport === SPORT.SQUASH).length;
  const badmintonSessions = yearHistory.filter(s => s.sport === SPORT.BADMINTON).length;
  const pingpongSessions = totalSessions - squashSessions - badmintonSessions;

  const monthCounts: Record<string, number> = {};
  yearHistory.forEach(s => {
    const m = s.datePlayed.slice(5, 7);
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });
  const MONTH_NAMES = ['STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE', 'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'];
  const busiestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestMonthName = busiestMonth ? MONTH_NAMES[parseInt(busiestMonth[0], 10) - 1] : null;
  const busiestMonthCount = busiestMonth ? busiestMonth[1] : 0;

  let bestPair: [string, string] | null = null;
  let bestPairCount = 0;
  for (let i = 0; i < perPlayer.length; i++) {
    for (let j = i + 1; j < perPlayer.length; j++) {
      const count = yearHistory.filter(s =>
        s.presentPlayers.includes(perPlayer[i].name) &&
        s.presentPlayers.includes(perPlayer[j].name),
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
    avgPlayersPerSession: Math.round(avgPlayersPerSession * 10) / 10,
    pingpongSessions,
    squashSessions,
    badmintonSessions,
    busiestMonthName,
    busiestMonthCount,
    bestPair,
    bestPairCount,
    champion: sorted[0] || null,
    players: sorted,
  };
}
