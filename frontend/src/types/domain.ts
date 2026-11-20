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
   * Liczba zarezerwowanych kortów/stołów. Domyślnie 1 (stare sesje).
   * Wpływa na limit kart MultiSport honorowanych w recepcji.
   */
  courtCount?: number;
  /**
   * Czas trwania sesji w godzinach. Domyślnie 1 (stare sesje).
   * Każda godzina ma osobny limit kart MultiSport.
   */
  durationHours?: number;
  /**
   * Posiadacze kart odbijający się tylko raz na sesję (Medicover) — migawka
   * cechy gracza z chwili zapisu, podzbiór `multiPlayers`.
   */
  singleScanPlayers?: string[];
  /**
   * Zasada podziału zniżek. `'perScan'` — każde odbicie karty dla tego, kto się
   * odbił. Brak pola — dawna zasada (sesje sprzed zmiany).
   */
  discountModel?: 'perScan';
  /**
   * Cena kortu przed zwrotem za karty (bez rakiet), z rezerwacji. `cost` to
   * kwota po zwrocie plus rakiety; faktyczny zwrot = `courtGross − (cost − racketCost)`.
   * Tylko sesje `perScan`.
   */
  courtGross?: number;
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
  /** Gracze z kartą jednorazową (Medicover): 1 odbicie na sesję. */
  singleScanPlayers?: string[];
  deletedPlayers: string[];
  playerJoinDate: PlayerJoinDates;
  /** @deprecated Format zaszłościowy, tylko do odczytu. Zapisujemy `playerJoinDate`. */
  playerJoinWeek?: Record<string, number>;
  lastAddedSession?: { id: string; ts: number };
}

/**
 * Węzeł `appData` dokładnie tak, jak leży w bazie. Firebase nie przechowuje pustych
 * tablic ani obiektów, więc każde pole może brakować, a przy pierwszym zapisie
 * brakuje całego węzła. Mutacje czytają go przez `|| []`, a nie przez obietnicę
 * `RawAppData`, której baza nie składa — dlatego typ jest częściowy.
 */
export type StoredAppData = Partial<RawAppData> & {
  /** @deprecated Kursor „rozliczony do sesji X” z dawnej wersji apki; każdy zapis go usuwa (patrz `withTransaction`). */
  paidUntilWeek?: unknown;
};

export interface NormalizedData {
  players: string[];
  weeks: Week[];
  payments: Record<string, Payment[]>;
  defaultMultiPlayers: string[];
  singleScanPlayers: string[];
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
