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
export const SPORT = { PINGPONG: 'pingpong', SQUASH: 'squash', BADMINTON: 'badminton', PADEL: 'padel' } as const;

/**
 * Sporty, w których wypożyczamy rakiety. To JEDYNA różnica między dyscyplinami —
 * sam podział kosztu kortu jest identyczny wszędzie (patrz `utils/sessionCost`).
 */
const RACKET_RENTAL_SPORTS: readonly string[] = [SPORT.SQUASH, SPORT.BADMINTON, SPORT.PADEL];
export const hasRacketRental = (sport?: string): boolean => RACKET_RENTAL_SPORTS.includes(sport ?? '');

export const SPORT_EMOJI: Record<string, string> = { pingpong: '🏓', squash: '🎾', badminton: '🏸', padel: '🥎' };
export const SPORT_LABEL: Record<string, string> = { pingpong: 'Ping-Pong', squash: 'Squash', badminton: 'Badminton', padel: 'Padel' };
export const SPORT_SHORT: Record<string, string> = { pingpong: 'PING', squash: 'SQUASH', badminton: 'BADM', padel: 'PADEL' };
/** Biernik do zdania „Graliśmy w …" w wiadomości na grupę. */
export const SPORT_ACCUSATIVE: Record<string, string> = { pingpong: 'ping-ponga', squash: 'squasha', badminton: 'badmintona', padel: 'padla' };

/**
 * Karta Multisport obniża rachunek w recepcji o stałą kwotę za każdą okazaną
 * kartę. W aplikacji wpisujemy kwotę już po tym odliczeniu, więc zniżka wraca
 * do rozliczenia jako rabat dla jej posiadacza (patrz `utils/sessionCost`).
 */
export const MULTISPORT_DISCOUNT = 15;
export const RACKET_PRICE = 5;
export const MAX_RENTED_RACKETS = 4; // 2 korty × 2 rakietki — nigdy nie potrzeba więcej
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
