export const SPORT_PINGPONG = 'pingpong' as const;
export const SPORT_SQUASH = 'squash' as const;

export type Sport = typeof SPORT_PINGPONG | typeof SPORT_SQUASH;

export interface Week {
  id: string;
  date: string;
  cost: number;
  sport: Sport;
  present: string[];
  multiPlayers: string[];
  racketCost?: number;
  ownRacketPlayers?: string[];
  /** Gracze, którzy zostali na dogrywkę (dzielą overtimeCost po równo, bez zniżek). */
  overtimePlayers?: string[];
  /** Łączny koszt dogrywki (np. 15 zł za dodatkowy stół). */
  overtimeCost?: number;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

export interface RawAppData {
  players: string[];
  weeks: Week[];
  paidUntilWeek: Record<string, string>;
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  playerJoinWeek: Record<string, number>;
  lastAddedSession?: { id: string; ts: number };
}

export interface NormalizedData {
  players: string[];
  weeks: Week[];
  paidUntilWeek: Record<string, string>;
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  playerJoinWeek: Record<string, number>;
}

export interface TransactionResult {
  success: boolean;
  error?: string;
}

export interface SettleResult extends TransactionResult {
  previousValue?: string | null;
  previousPayments?: Payment[];
}

export interface AddPaymentResult extends TransactionResult {
  paymentId?: string;
}
