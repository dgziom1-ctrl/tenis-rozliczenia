import { getRank, SPORT } from '@/constants';
import { getPlayerAchievements } from '@/utils/achievements';
import type { Sport } from '@/types/domain';
import type {
  Achievement,
  CardRarity,
  ExtendedPlayerStats,
  HistoryEntry,
  PlayerCardMeta,
  Rank,
  SportCount,
} from '@/types/ui';

const SPORT_ORDER: readonly Sport[] = [SPORT.PINGPONG, SPORT.SQUASH, SPORT.BADMINTON, SPORT.PADEL];

export const RARITY_BY_RANK: Record<string, CardRarity> = {
  LEGENDA: 'legend',
  MISTRZ: 'elite',
  WETERAN: 'epic',
  STAŁY: 'rare',
  GOŚĆ: 'common',
  DUCH: 'ghost',
};

export const RARITY_LABEL: Record<CardRarity, string> = {
  legend: 'HOLO',
  elite: 'ELITA',
  epic: 'EPICKA',
  rare: 'RZADKA',
  common: 'ZWYKŁA',
  ghost: 'DUCH',
};

export const RARITY_CARD_CLASS: Record<CardRarity, string> = {
  legend: 'fifa-card fifa-card-legend',
  elite: 'fifa-card fifa-card-elite',
  epic: 'fifa-card fifa-card-epic',
  rare: 'fifa-card fifa-card-rare',
  common: 'fifa-card fifa-card-common',
  ghost: 'fifa-card fifa-card-ghost',
};

export const RARITY_FOIL_CLASS: Record<CardRarity, string> = {
  legend: 'card-foil card-foil-legend',
  elite: 'card-foil card-foil-elite',
  epic: 'card-foil card-foil-epic',
  rare: 'card-foil card-foil-rare',
  common: 'card-foil card-foil-common',
  ghost: 'card-foil card-foil-ghost',
};

/**
 * Overall w skali FIFA (40–99).
 * Podłoga 40 + frekwencja (do +48) + seria (do +12) + staż (do +10).
 * Legenda z regularną serią ląduje w okolicach 90+, nowy gracz na 40.
 */
export function overallRating(pct: number, streak: number, sessions: number): number {
  const fromPct = Math.max(0, Math.min(100, pct)) * 0.48;
  const fromStreak = Math.min(12, Math.max(0, streak) * 0.6);
  const fromSessions = Math.min(10, Math.max(0, sessions) * 0.2);
  return Math.round(Math.min(99, 40 + fromPct + fromStreak + fromSessions));
}

export function rarityOf(rank: Rank): CardRarity {
  return RARITY_BY_RANK[rank.name] ?? 'common';
}

export function playerSportMix(playerName: string, history: HistoryEntry[]): SportCount[] {
  const counts: Record<Sport, number> = {
    pingpong: 0,
    squash: 0,
    badminton: 0,
    padel: 0,
  };
  for (const session of history) {
    if (!session.presentPlayers.includes(playerName)) continue;
    const raw = session.sport;
    const sport: Sport = (SPORT_ORDER as readonly string[]).includes(raw) ? raw : SPORT.PINGPONG;
    counts[sport] += 1;
  }
  return SPORT_ORDER
    .map(sport => ({ sport, count: counts[sport] }))
    .filter(row => row.count > 0);
}

export function buildPlayerCardMeta(
  player: ExtendedPlayerStats,
  history: HistoryEntry[],
): PlayerCardMeta {
  const rank = getRank(player.attendancePercentage);
  const achievements: Achievement[] = getPlayerAchievements(player, history);
  return {
    overall: overallRating(player.attendancePercentage, player.currentStreak, player.attendanceCount),
    rank,
    rarity: rarityOf(rank),
    sports: playerSportMix(player.name, history),
    currentStreak: player.currentStreak,
    attendancePercentage: player.attendancePercentage,
    topAchievements: achievements.slice(0, 4),
  };
}
