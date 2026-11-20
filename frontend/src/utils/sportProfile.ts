import type { HistoryEntry } from '@/types/ui';

/** Kolejność osi radaru: góra, prawo, dół, lewo. */
export const RADAR_SPORTS = ['pingpong', 'squash', 'badminton', 'padel'] as const;
export type RadarSport = (typeof RADAR_SPORTS)[number];

export interface SportProfile {
  /** Liczba sesji gracza w każdym sporcie. */
  counts: Record<RadarSport, number>;
  /** Udział sportu w sesjach gracza (0–1). */
  playerShare: Record<RadarSport, number>;
  /** Udział sportu w obecnościach całej grupy (0–1), punkt odniesienia. */
  groupShare: Record<RadarSport, number>;
  total: number;
}

const empty = (): Record<RadarSport, number> => ({ pingpong: 0, squash: 0, badminton: 0, padel: 0 });

function shares(counts: Record<RadarSport, number>): Record<RadarSport, number> {
  const total = RADAR_SPORTS.reduce((sum, s) => sum + counts[s], 0);
  const out = empty();
  if (total === 0) return out;
  for (const s of RADAR_SPORTS) out[s] = counts[s] / total;
  return out;
}

/**
 * Profil sportowy gracza: jak jego sesje rozkładają się między sporty, obok
 * rozkładu całej grupy. Tylko odczyt historii, bez kosztów i sald.
 */
export function buildSportProfile(history: HistoryEntry[], playerName: string): SportProfile {
  const counts = empty();
  const group = empty();
  for (const session of history) {
    const sport = session.sport as RadarSport;
    if (!RADAR_SPORTS.includes(sport)) continue;
    group[sport] += session.presentPlayers.length;
    if (session.presentPlayers.includes(playerName)) counts[sport] += 1;
  }
  const total = RADAR_SPORTS.reduce((sum, s) => sum + counts[s], 0);
  return { counts, playerShare: shares(counts), groupShare: shares(group), total };
}
