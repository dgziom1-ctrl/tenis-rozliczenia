import type { ExtendedPlayerStats, Achievement, HistoryEntry } from '@/types/ui';
import { filterHistorySinceJoin } from './playerHistory';

export const STREAK_MILESTONES: readonly number[] = [5, 10, 15, 20, 25, 30, 40, 50];
const PERFECT_MONTH_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];

export function isStreakMilestone(n: number): boolean {
  return STREAK_MILESTONES.includes(n);
}

interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  check: (player: ExtendedPlayerStats, history: HistoryEntry[]) => boolean;
}

/** Ile miesięcy z min. 3 sesjami gracz miał 100% frekwencji. */
export function countPerfectMonths(playerName: string, history: HistoryEntry[]): number {
  const months: Record<string, { total: number; present: number }> = {};
  for (const s of history) {
    const key = s.datePlayed?.slice(0, 7);
    if (!key) continue;
    if (!months[key]) months[key] = { total: 0, present: 0 };
    months[key].total++;
    if (s.presentPlayers.includes(playerName)) months[key].present++;
  }
  return Object.values(months).filter(m => m.total >= 3 && m.present === m.total).length;
}

const STATIC_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_session',
    label: 'Debiut',
    desc: 'Pierwsza sesja',
    check: (player, history) => history.some(s => s.presentPlayers.includes(player.name)),
  },
  {
    id: 'perfect_month',
    label: 'Perfekcyjny miesiąc',
    desc: '100% w jednym miesiącu (min. 3 sesje)',
    check: (player, history) => countPerfectMonths(player.name, history) >= 1,
  },
  {
    id: 'sessions_10',
    label: '10 sesji',
    desc: 'Łącznie 10 sesji na koncie',
    check: (player) => (player.attendanceCount || 0) >= 10,
  },
  {
    id: 'sessions_25',
    label: '25 sesji',
    desc: 'Łącznie 25 sesji na koncie',
    check: (player) => (player.attendanceCount || 0) >= 25,
  },
  {
    id: 'sessions_50',
    label: '50 sesji',
    desc: 'Łącznie 50 sesji na koncie',
    check: (player) => (player.attendanceCount || 0) >= 50,
  },
];

export function getPlayerAchievements(
  player: ExtendedPlayerStats,
  history: HistoryEntry[],
): Achievement[] {
  const earned: Achievement[] = [];
  // Sesje sprzed dołączenia nie są nieobecnościami gracza — nie mogą więc
  // blokować „Perfekcyjnego miesiąca" ani „Debiutu".
  const eligibleHistory = filterHistorySinceJoin(history, player.joinDate);

  for (const ach of STATIC_ACHIEVEMENTS) {
    if (ach.check(player, eligibleHistory)) {
      earned.push({ id: ach.id, label: ach.label, desc: ach.desc });
    }
  }

  const perfectMonths = countPerfectMonths(player.name, eligibleHistory);
  for (const milestone of PERFECT_MONTH_MILESTONES) {
    if (perfectMonths >= milestone) {
      earned.push({
        id: `perfect_month_${milestone}`,
        label: `Perfekcyjny miesiąc ×${milestone}`,
        desc: `${milestone} miesięcy ze 100% frekwencją (min. 3 sesje/mies.)`,
      });
    }
  }

  let maxStreak = 0, cur = 0;
  for (const s of [...eligibleHistory].reverse()) {
    if (s.presentPlayers.includes(player.name)) { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }
  for (const milestone of STREAK_MILESTONES) {
    if (maxStreak >= milestone) {
      earned.push({
        id: `streak_${milestone}`,
        label: `Seria ${milestone}`,
        desc: `${milestone} sesji z rzędu`,
      });
    }
  }

  return earned;
}
