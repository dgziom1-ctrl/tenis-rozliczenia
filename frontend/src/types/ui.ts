import type { Sport, Payment } from './domain';

export interface PlayerStats {
  name: string;
  attendanceCount: number;
  currentDebt: number;
}

export interface ExtendedPlayerStats extends PlayerStats {
  attendancePercentage: number;
  currentStreak: number;
  multisportCount: number;
}

export interface RankedPlayer extends ExtendedPlayerStats {
  place: number;
}

export interface HistoryEntry {
  id: string;
  datePlayed: string;
  totalCost: number;
  sport: Sport;
  costPerPerson: number;
  costPerPersonMulti: number;
  presentPlayers: string[];
  multisportPlayers: string[];
}

export interface Summary {
  totalToCollect: number;
  settledPlayers: number;
  totalPlayers: number;
  totalWeeks: number;
}

export interface UIData {
  summary: Summary;
  players: PlayerStats[];
  playerNames: string[];
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  history: HistoryEntry[];
  paidUntilWeek: Record<string, string>;
  payments: Record<string, Payment[]>;
}

export interface DebtSession {
  sessionId: string;
  date: string;
  amount: number;
}

export interface DebtDisplayPayment {
  id: string;
  amount: number;
  date: string;
}

export interface DebtDisplayData {
  sessions: DebtSession[];
  payments: DebtDisplayPayment[];
  totalSessions: number;
  totalPaid: number;
  balance: number;
}

export interface Rank {
  min: number;
  emoji: string;
  name: string;
  color: string;
  bg: string;
  border: string;
  hex: string;
}

export interface PlayerBadge {
  icon: string;
  label: string;
  color: string;
}

export interface Achievement {
  id: string;
  label: string;
  desc: string;
  emoji: string;
}

export interface MonthGroup {
  label: string;
  rows: HistoryEntry[];
}

export interface MonthlySessionData {
  total: number;
  players: Record<string, number>;
}

export interface RankingHistoryEntry {
  month: string;
  rankings: Array<{
    name: string;
    pct: number;
    attended: number;
    place: number;
  }>;
}

export interface PlayerColor {
  bg: string;
  border: string;
  text: string;
}

export type SoundType = 'tab' | 'click' | 'success' | 'delete' | 'coin' | 'rank1' | 'error';
export type Theme = 'dark' | 'light';
export type TabId = 'dashboard' | 'attendance' | 'admin' | 'history' | 'players';

export interface ThemeTokens {
  confirmBg: string;
  confirmBorder: string;
  confirmText: string;
  accentBorder: string;
  accentText: string;
  accentBg: string;
  accentColor: string;
  cancelBorder: string;
  cancelText: string;
  overlayBg: string;
  modalBg: string;
  modalRadius: string;
  modalShadow: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  cellBg: string;
  cellBorder: string;
  cellLabelText: string;
  bodyText: string;
  mutedText: string;
  undoBg: string;
  undoBorder: string;
  undoText: string;
  undoProgressBg: string;
  fontFamily: string;
  fontSize: string;
}

export interface WrappedPlayerStats {
  name: string;
  attended: number;
  missed: number;
  percentage: number;
  totalCost: number;
  avgCost: number;
  longestStreak: number;
  multiSessions: number;
  place?: number;
}

export interface WrappedStats {
  year: number;
  totalSessions: number;
  totalCost: number;
  avgPlayersPerSession: number;
  pingpongSessions: number;
  squashSessions: number;
  busiestMonthName: string | null;
  busiestMonthCount: number;
  mostExpensiveSession: {
    date: string;
    cost: number;
    players: number;
  } | null;
  bestPair: [string, string] | null;
  bestPairCount: number;
  champion: WrappedPlayerStats | null;
  players: WrappedPlayerStats[];
}
