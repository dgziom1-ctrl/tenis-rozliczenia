import { getRank } from '@/constants';
import { isStreakMilestone } from '@/utils/achievements';
import { calculatePlayerStats } from '@/utils/rankings';
import type { HistoryEntry, PlayerStats, SessionHighlight } from '@/types/ui';

/**
 * Wstawia świeżo dodaną sesję do historii (najnowsza pierwsza), tak jak
 * `buildHistory` — seria liczy się od najnowszej daty, nie od momentu wpisu.
 */
export function historyWithAddedSession(
  history: HistoryEntry[],
  added: HistoryEntry,
): HistoryEntry[] {
  return [added, ...history].sort((a, b) => {
    const byDate = b.datePlayed.localeCompare(a.datePlayed);
    return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
  });
}

function bumpAttendance(player: PlayerStats, sessionDate: string): PlayerStats {
  if (player.joinDate && sessionDate < player.joinDate) return player;
  return {
    ...player,
    attendanceCount: player.attendanceCount + 1,
    eligibleWeeks: player.eligibleWeeks + 1,
  };
}

/**
 * Co warto wykrzyczeć po zapisaniu sesji: debiut, kamień milowy serii, awans rangi.
 * Debiut nie dostaje jednocześnie „awansu" — pierwsza sesja i tak skacze z 0% na 100%.
 */
export function detectSessionHighlights(
  players: PlayerStats[],
  history: HistoryEntry[],
  added: HistoryEntry,
): SessionHighlight[] {
  const before = calculatePlayerStats(players, history, history.length);
  const afterHistory = historyWithAddedSession(history, added);
  const afterPlayers = players.map(player => (
    added.presentPlayers.includes(player.name)
      ? bumpAttendance(player, added.datePlayed)
      : player
  ));
  const after = calculatePlayerStats(afterPlayers, afterHistory, afterHistory.length);

  const highlights: SessionHighlight[] = [];
  for (const name of added.presentPlayers) {
    const prev = before.find(p => p.name === name);
    const next = after.find(p => p.name === name);
    if (!next) continue;

    const isDebut = !prev || prev.attendanceCount === 0;
    if (isDebut) {
      highlights.push({ name, kind: 'debut', label: 'Debiut' });
      continue;
    }

    if (isStreakMilestone(next.currentStreak) && next.currentStreak > prev.currentStreak) {
      highlights.push({ name, kind: 'streak', label: `Seria ${next.currentStreak}` });
    }

    const rankBefore = getRank(prev.attendancePercentage);
    const rankAfter = getRank(next.attendancePercentage);
    if (rankAfter.min > rankBefore.min) {
      highlights.push({
        name,
        kind: 'rankup',
        label: `${rankAfter.emoji} ${rankAfter.name}`,
      });
    }
  }
  return highlights;
}
