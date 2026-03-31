import type { PlayerStats, ExtendedPlayerStats, RankedPlayer, RankingHistoryEntry, HistoryEntry } from '@/types/ui';

export function calculatePlayerStats(
  players: PlayerStats[],
  history: HistoryEntry[],
  totalWeeks: number,
): ExtendedPlayerStats[] {
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

export function assignRankingPlaces(sortedPlayers: ExtendedPlayerStats[]): RankedPlayer[] {
  let currentPlace = 1;
  return sortedPlayers.map((player, index) => {
    if (index > 0 && player.attendancePercentage < sortedPlayers[index - 1].attendancePercentage) {
      currentPlace = index + 1;
    }
    return { ...player, place: currentPlace };
  });
}

export function calculateSeasonPlayerStats(
  players: PlayerStats[],
  seasonHistory: HistoryEntry[],
): ExtendedPlayerStats[] {
  if (!players || !seasonHistory) return [];
  const totalWeeks = seasonHistory.length;

  return players.map(player => {
    const { name } = player;
    const attendanceCount = seasonHistory.filter(s => s.presentPlayers.includes(name)).length;
    const attendancePercentage = totalWeeks > 0 ? Math.round((attendanceCount / totalWeeks) * 100) : 0;

    let currentStreak = 0;
    for (const session of seasonHistory) {
      if (session.presentPlayers.includes(name)) currentStreak++;
      else break;
    }

    const multisportCount = seasonHistory.filter(s => s.multisportPlayers.includes(name)).length;
    return { ...player, attendanceCount, attendancePercentage, currentStreak, multisportCount };
  }).filter(p => p.attendanceCount > 0);
}

export function computeRankingHistory(
  players: PlayerStats[],
  history: HistoryEntry[],
): RankingHistoryEntry[] {
  if (!history || history.length === 0 || !players || players.length === 0) return [];

  const monthSet = new Set<string>();
  history.forEach(s => { if (s.datePlayed) monthSet.add(s.datePlayed.slice(0, 7)); });
  const months = [...monthSet].sort();
  const playerNames = players.map(p => p.name);

  return months.map(month => {
    const sessionsUpTo = history.filter(s => s.datePlayed?.slice(0, 7) <= month);
    const total = sessionsUpTo.length;
    if (total === 0) return null;

    const stats = playerNames.map(name => {
      const attended = sessionsUpTo.filter(s => s.presentPlayers.includes(name)).length;
      const pct = Math.round((attended / total) * 100);
      return { name, pct, attended };
    });

    stats.sort((a, b) => b.pct - a.pct || b.attended - a.attended);
    let place = 1;
    const rankings = stats.map((p, i) => {
      if (i > 0 && p.pct < stats[i - 1].pct) place = i + 1;
      return { ...p, place };
    });

    return { month, rankings };
  }).filter((x): x is RankingHistoryEntry => x !== null);
}
