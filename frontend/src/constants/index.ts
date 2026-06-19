export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? '';
export const BREAKDOWN_EPSILON = 0.05;
export const SETTLED_THRESHOLD = 0.01;
export const UNDO_TIMEOUT_SECONDS = 8;
export const QUICK_COSTS = [0, 15, 30, 45, 60];
export const SPORT = { PINGPONG: 'pingpong', SQUASH: 'squash' } as const;
export const SQUASH_BASE_PRICE = 85;
export const SQUASH_MULTISPORT_DISCOUNT = 15;
export const SQUASH_QUICK_COSTS = [55, 70, 85, 110, 125, 140, 155, 170];
export const RACKET_PRICE = 5;
export const SQUASH_MAX_COURT_RACKETS = 4; // 2 korty × 2 rakietki — nigdy nie potrzeba więcej
export const OVERTIME_DEFAULT_COST = 15; // dogrywka: dodatkowe 30 min, 1 stół = 15 zł
export const SOUND_TYPES = { TAB: 'tab', CLICK: 'click', SUCCESS: 'success', DELETE: 'delete', COIN: 'coin', RANK1: 'rank1', ERROR: 'error' } as const;
export const TABS = { DASHBOARD: 'dashboard', ATTENDANCE: 'attendance', ADMIN: 'admin', HISTORY: 'history', PLAYERS: 'players' } as const;
export const ORGANIZER_NAME = 'Kamil';
export const PAYMENT_MODAL = { EXACT: 'exact', CUSTOM: 'custom' } as const;
export const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

export { RANKS, getRank, PODIUM, PODIUM_ORDER } from './ranks';
export { PLAYER_COLOR_PALETTE, getPlayerColor } from './colors';
export { CLIP, FONT, PANEL } from './styles';
