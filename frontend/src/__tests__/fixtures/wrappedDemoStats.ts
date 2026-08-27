import type { WrappedStats } from '@/types/ui';

/** Dane testowe do renderu WrappedModal — nie trafiają do bundla produkcyjnego. */
export const WRAPPED_DEMO_STATS: WrappedStats = {
  year: 2025,
  totalSessions: 42,
  avgPlayersPerSession: 6.2,
  pingpongSessions: 28,
  squashSessions: 8,
  badmintonSessions: 4,
  padelSessions: 2,
  busiestMonthName: 'MAR',
  busiestMonthCount: 7,
  bestPair: ['Ania', 'Bartek'],
  bestPairCount: 15,
  champion: {
    name: 'Ania',
    attended: 38,
    missed: 4,
    percentage: 90,
    longestStreak: 12,
    place: 1,
  },
  players: [
    { name: 'Ania', attended: 38, missed: 4, percentage: 90, longestStreak: 12, place: 1 },
    { name: 'Bartek', attended: 35, missed: 7, percentage: 83, longestStreak: 8, place: 2 },
    { name: 'Cezary', attended: 33, missed: 9, percentage: 79, longestStreak: 6, place: 3 },
    { name: 'Dorota', attended: 28, missed: 14, percentage: 67, longestStreak: 4, place: 4 },
    { name: 'Ewa', attended: 25, missed: 17, percentage: 60, longestStreak: 3, place: 5 },
    { name: 'Filip', attended: 20, missed: 22, percentage: 48, longestStreak: 2, place: 6 },
  ],
};
