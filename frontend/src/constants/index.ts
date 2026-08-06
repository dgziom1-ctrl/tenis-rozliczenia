import type { TabId } from '@/types/ui';

/**
 * Hasło do operacji nieodwracalnych. Jest wkompilowane w paczkę JS, więc nie
 * jest sekretem — chroni tylko przed przypadkowym kliknięciem, nie przed
 * kimś, kto chce się dostać do danych (patrz README, sekcja Security).
 */
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';

/** Czy w ogóle da się potwierdzić hasłem — puste hasło NIE odblokowuje niczego. */
export const isAdminPasswordConfigured = (): boolean => ADMIN_PASSWORD.length > 0;
export const SETTLED_THRESHOLD = 0.01;
export const UNDO_TIMEOUT_SECONDS = 8;
export const QUICK_COSTS = [0, 15, 30, 45, 60];
export const SPORT = { PINGPONG: 'pingpong', SQUASH: 'squash', BADMINTON: 'badminton' } as const;
/** Sporty kortowe (squash, badminton) — taki sam model kosztów: zniżka Multisport + rakiety. */
export const isCourtSport = (sport?: string): boolean => sport === SPORT.SQUASH || sport === SPORT.BADMINTON;
export const SPORT_EMOJI: Record<string, string> = { pingpong: '🏓', squash: '🎾', badminton: '🏸' };
export const SPORT_LABEL: Record<string, string> = { pingpong: 'Ping-Pong', squash: 'Squash', badminton: 'Badminton' };
export const SPORT_SHORT: Record<string, string> = { pingpong: 'PING', squash: 'SQUASH', badminton: 'BADM' };
export const SQUASH_MULTISPORT_DISCOUNT = 15;
export const SQUASH_QUICK_COSTS = [55, 70, 85, 110, 125, 140, 155, 170];
export const RACKET_PRICE = 5;
export const SQUASH_MAX_COURT_RACKETS = 4; // 2 korty × 2 rakietki — nigdy nie potrzeba więcej
export const OVERTIME_DEFAULT_COST = 15; // dogrywka: dodatkowe 30 min, 1 stół = 15 zł
export const SOUND_TYPES = { TAB: 'tab', CLICK: 'click', SUCCESS: 'success', DELETE: 'delete', COIN: 'coin', RANK1: 'rank1', ERROR: 'error' } as const;
export const TABS = { DASHBOARD: 'dashboard', ATTENDANCE: 'attendance', ADMIN: 'admin', HISTORY: 'history', PLAYERS: 'players' } as const;

/** Jedyne odwzorowanie zakładka ↔ adres. Trzymane w jednym miejscu, żeby nawigacja z różnych ekranów nie mogła się rozjechać. */
export const TAB_PATHS: Record<string, string> = {
  [TABS.DASHBOARD]: '/',
  [TABS.ATTENDANCE]: '/attendance',
  [TABS.ADMIN]: '/admin',
  [TABS.HISTORY]: '/history',
  [TABS.PLAYERS]: '/players',
};

export const PATH_TO_TAB: Record<string, TabId> = {
  '/': TABS.DASHBOARD,
  '/attendance': TABS.ATTENDANCE,
  '/admin': TABS.ADMIN,
  '/history': TABS.HISTORY,
  '/players': TABS.PLAYERS,
};
export const ORGANIZER_NAME = 'Kamil';
export const PAYMENT_MODAL = { EXACT: 'exact', CUSTOM: 'custom' } as const;
export const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

export { RANKS, getRank, PODIUM_ORDER } from './ranks';
