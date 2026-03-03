// ============================================================================
// CENTRALIZED CONSTANTS
// ============================================================================

export const ADMIN_PASSWORD = 'ponk2026';

export const RANKS = [
  { min: 90, emoji: '🏆', name: 'LEGENDA',  color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-600' },
  { min: 75, emoji: '⭐',  name: 'MISTRZ',   color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-700' },
  { min: 60, emoji: '🎖️', name: 'WETERAN',  color: 'text-violet-400', bg: 'bg-violet-950/40', border: 'border-violet-700' },
  { min: 45, emoji: '🔥', name: 'STAŁY',    color: 'text-rose-400',   bg: 'bg-rose-950/40',   border: 'border-rose-800' },
  { min: 20, emoji: '👀', name: 'GOŚĆ',     color: 'text-cyan-400',   bg: 'bg-cyan-950/40',   border: 'border-cyan-800' },
  { min:  0, emoji: '👻', name: 'DUCH',     color: 'text-slate-500',  bg: 'bg-slate-900/40',  border: 'border-slate-700' },
];

export const getRank = (pct) => RANKS.find(r => pct >= r.min) || RANKS[RANKS.length - 1];

export const PODIUM = {
  1: { medal: '🥇', barHeight: 120, cardStyle: 'border-yellow-400 bg-yellow-950/50 shadow-[0_0_25px_#ffd70045]', textColor: 'text-yellow-200', badgeStyle: 'border-yellow-500 bg-yellow-900/60 text-yellow-300' },
  2: { medal: '🥈', barHeight: 80,  cardStyle: 'border-slate-400 bg-slate-900/50 shadow-[0_0_12px_#94a3b820]',   textColor: 'text-slate-200',  badgeStyle: 'border-slate-500 bg-slate-800/60 text-slate-300' },
  3: { medal: '🥉', barHeight: 55,  cardStyle: 'border-amber-700 bg-amber-950/50 shadow-[0_0_10px_#92400e25]',   textColor: 'text-amber-300',  badgeStyle: 'border-amber-600 bg-amber-900/60 text-amber-300' },
};

export const PODIUM_ORDER = [2, 1, 3];

export const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

export const UNDO_TIMEOUT_SECONDS = 10;
export const QUICK_COSTS = [0, 15, 30, 45, 60];
export const SECRET_EASTER_EGG = 'ponk';

export const SOUND_TYPES = {
  TAB: 'tab',
  CLICK: 'click',
  SUCCESS: 'success',
  DELETE: 'delete',
  COIN: 'coin',
};

export const TABS = {
  DASHBOARD: 'dashboard',
  ATTENDANCE: 'attendance',
  ADMIN: 'admin',
  HISTORY: 'history',
  PLAYERS: 'players',
};

export const ORGANIZER_NAME = 'Kamil';
