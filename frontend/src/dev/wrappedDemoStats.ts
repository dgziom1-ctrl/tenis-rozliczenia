import type { WrappedStats } from '@/types/ui';

/** Bogaty zestaw demo do podglądu Wrapped — nie używany w produkcji. */
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
    multiSessions: 22,
    place: 1,
  },
  players: [
    { name: 'Ania', attended: 38, missed: 4, percentage: 90, longestStreak: 12, multiSessions: 22, place: 1 },
    { name: 'Bartek', attended: 35, missed: 7, percentage: 83, longestStreak: 8, multiSessions: 18, place: 2 },
    { name: 'Cezary', attended: 33, missed: 9, percentage: 79, longestStreak: 6, multiSessions: 15, place: 3 },
    { name: 'Dorota', attended: 28, missed: 14, percentage: 67, longestStreak: 4, multiSessions: 10, place: 4 },
    { name: 'Ewa', attended: 25, missed: 17, percentage: 60, longestStreak: 3, multiSessions: 8, place: 5 },
    { name: 'Filip', attended: 20, missed: 22, percentage: 48, longestStreak: 2, multiSessions: 5, place: 6 },
  ],
};
