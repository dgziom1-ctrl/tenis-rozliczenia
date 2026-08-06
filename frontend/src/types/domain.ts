export type Sport = 'pingpong' | 'squash' | 'badminton';

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
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  playerJoinWeek: Record<string, number>;
  lastAddedSession?: { id: string; ts: number };
}

export interface NormalizedData {
  players: string[];
  weeks: Week[];
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  playerJoinWeek: Record<string, number>;
}

export interface TransactionResult {
  success: boolean;
  error?: string;
  /**
   * Zapis przekroczył limit czasu i nie wiemy, czy serwer go zatwierdził.
   * Ponowienie operacji dopisującej (np. wpłaty) mogłoby ją zdublować.
   */
  indeterminate?: boolean;
}

export interface AddPaymentResult extends TransactionResult {
  paymentId?: string;
}
