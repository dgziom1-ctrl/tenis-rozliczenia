import type { ExtendedPlayerStats, PlayerBadge, Achievement, HistoryEntry } from '@/types/ui';

export function getPlayerBadge(
  player: ExtendedPlayerStats,
  allPlayers: ExtendedPlayerStats[],
): PlayerBadge | null {
  if (!allPlayers || allPlayers.length === 0) return null;

  const agg = allPlayers.reduce((acc, p) => {
    const streak = p.currentStreak || 0;
    const multi = p.multisportCount || 0;
    const att = p.attendanceCount || 0;
    return {
      maxStreak: Math.max(acc.maxStreak, streak),
      maxMulti: Math.max(acc.maxMulti, multi),
      maxAttendance: Math.max(acc.maxAttendance, att),
      minAttendance: Math.min(acc.minAttendance, p.attendanceCount ?? Infinity),
      streakHolders: streak === acc.maxStreak ? acc.streakHolders + 1 : streak > acc.maxStreak ? 1 : acc.streakHolders,
      multiHolders: multi === acc.maxMulti ? acc.multiHolders + 1 : multi > acc.maxMulti ? 1 : acc.multiHolders,
      attendHolders: att === acc.maxAttendance ? acc.attendHolders + 1 : att > acc.maxAttendance ? 1 : acc.attendHolders,
      minAttHolders: att === acc.minAttendance ? acc.minAttHolders + 1 : att < acc.minAttendance ? 1 : acc.minAttHolders,
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

const STREAK_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];

interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  emoji: string;
  check: (player: ExtendedPlayerStats, history: HistoryEntry[]) => boolean;
}

const STATIC_ACHIEVEMENTS: AchievementDef[] = [
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
      const months: Record<string, { total: number; present: number }> = {};
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

export function getPlayerAchievements(
  player: ExtendedPlayerStats,
  history: HistoryEntry[],
): Achievement[] {
  const earned: Achievement[] = [];

  for (const ach of STATIC_ACHIEVEMENTS) {
    if (ach.check(player, history)) {
      earned.push({ id: ach.id, label: ach.label, desc: ach.desc, emoji: ach.emoji });
    }
  }

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
