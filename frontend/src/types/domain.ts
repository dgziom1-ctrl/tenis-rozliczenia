export type Sport = 'pingpong' | 'squash' | 'badminton' | 'padel';

export interface Week {
  id: string;
  date: string;
  cost: number;
  sport: Sport;
  present: string[];
  multiPlayers: string[];
  racketCost?: number;
  ownRacketPlayers?: string[];
  /**
   * @deprecated Zaszłość po usuniętej dogrywce. Tylko do ODCZYTU — rozliczenie
   * dolicza tę kwotę do kosztu sesji, żeby stare rekordy nie zgubiły pieniędzy.
   * Nic już jej nie zapisuje; edycja sesji scala ją z `cost`.
   */
  overtimeCost?: number;
  /** @deprecated Zaszłość po usuniętej dogrywce. Tylko do odczytu, bez wpływu na kwoty. */
  overtimePlayers?: string[];
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

/**
 * Data (YYYY-MM-DD), od której gracz liczy się do frekwencji.
 *
 * Zastępuje `playerJoinWeek` — indeks w tablicy sesji, który przestawał się
 * zgadzać, gdy ktoś usunął sesję albo dopisał ją z datą wsteczną. Data jest
 * odporna na jedno i drugie. `playerJoinWeek` zostaje wyłącznie do ODCZYTU
 * starych rekordów; nic już go nie zapisuje.
 */
export type PlayerJoinDates = Record<string, string>;

export interface RawAppData {
  players: string[];
  weeks: Week[];
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  playerJoinDate: PlayerJoinDates;
  /** @deprecated Format zaszłościowy, tylko do odczytu. Zapisujemy `playerJoinDate`. */
  playerJoinWeek?: Record<string, number>;
  lastAddedSession?: { id: string; ts: number };
}

export interface NormalizedData {
  players: string[];
  weeks: Week[];
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  deletedPlayers: string[];
  playerJoinDate: PlayerJoinDates;
  /** @deprecated Format zaszłościowy, tylko do odczytu. */
  playerJoinWeek?: Record<string, number>;
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
