import { makeId } from '@/utils/id';
import { isValidMoney, isValidISODate, normalizePlayerList } from '@/utils/validation';
import { withTransaction, reject } from '../transaction';
import { sortWeeksByDate } from '../transforms';
import type { RawAppData, TransactionResult, Week } from '@/types/domain';
import type { Sport } from '@/types/domain';

interface SessionInput {
  totalCost: number;
  presentPlayers: string[];
  multisportPlayers?: string[];
  sport?: Sport;
  racketCost?: number;
  ownRacketPlayers?: string[];
  courtCount?: number;
  durationHours?: number;
}

interface NormalizedSession {
  cost: number;
  present: string[];
  multiPlayers: string[];
  /** Pomijane przy edycji starej sesji, która nie miała jeszcze pola `sport`. */
  sport?: Sport;
  racketCost?: number;
  ownRacketPlayers?: string[];
  courtCount?: number;
  durationHours?: number;
}

/**
 * Sprowadza dane sesji do postaci zapisywanej w bazie i odrzuca wszystko, co
 * mogłoby zepsuć rozliczenia: NaN, Infinity, kwoty ujemne, puste listy graczy,
 * duplikaty imion oraz graczy spoza listy obecnych.
 *
 * Zwraca komunikat błędu zamiast rzucać, żeby wywołujący mógł go pokazać.
 */
const SPORTS: readonly Sport[] = ['pingpong', 'squash', 'badminton', 'padel'];

function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value);
}

/**
 * Liczba kortów/godzin musi być całkowita i mieścić się w 1–12 — dokładnie
 * taki zakres przepuszczają reguły bazy. Wcześniej `Math.max(1, value)`
 * przepuszczało `NaN`, ułamki i wartości powyżej 12, a wtedy cały zapis węzła
 * `appData` był odrzucany jako „permission denied”.
 */
function normalizeCourtUnit(value: unknown, label: string): { value: number } | { error: string } {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 12) {
    return { error: `${label} musi być liczbą całkowitą od 1 do 12` };
  }
  return { value };
}

function normalizeSession(
  input: SessionInput,
  options: { preserveMissingCourtConfig?: boolean; preserveMissingSport?: boolean } = {},
): { session: NormalizedSession } | { error: string } {
  const { totalCost } = input;
  const sport = input.sport ?? (options.preserveMissingSport ? undefined : 'pingpong');

  if (!isValidMoney(totalCost)) {
    return { error: 'Koszt sesji musi być liczbą nieujemną' };
  }

  // Reguły bazy przepuszczają tylko dyscypliny z tej listy. Bez sprawdzenia
  // tutaj zapis wracałby jako „permission denied" bez czytelnego powodu.
  if (sport !== undefined && !isSport(sport)) {
    return { error: 'Nieznana dyscyplina sportu' };
  }

  const present = normalizePlayerList(input.presentPlayers);
  if (present.length === 0) {
    return { error: 'Zaznacz przynajmniej jednego obecnego gracza' };
  }

  // Gracz spoza listy obecnych nie może mieć karty ani rakiety.
  const multiPlayers = normalizePlayerList(input.multisportPlayers).filter(p => present.includes(p));
  const ownRacketPlayers = normalizePlayerList(input.ownRacketPlayers).filter(p => present.includes(p));

  const racketCost = input.racketCost;
  if (racketCost != null && !isValidMoney(racketCost)) {
    return { error: 'Koszt rakiet musi być liczbą nieujemną' };
  }
  if (racketCost != null && racketCost > totalCost) {
    return { error: 'Koszt rakiet nie może przekraczać kosztu sesji' };
  }

  // Liczba kortów i godzin — domyślnie 1 dla nowych sesji. Edycja starej
  // sesji może je zostawić `undefined`, żeby nie włączyć jej po cichu limitu
  // kart MultiSport, którego wcześniej nie miała.
  let courtCount: number | undefined;
  if (input.courtCount != null) {
    const normalizedCourtCount = normalizeCourtUnit(input.courtCount, 'Liczba kortów');
    if ('error' in normalizedCourtCount) return normalizedCourtCount;
    courtCount = normalizedCourtCount.value;
  } else if (!options.preserveMissingCourtConfig) {
    courtCount = 1;
  }

  let durationHours: number | undefined;
  if (input.durationHours != null) {
    const normalizedDurationHours = normalizeCourtUnit(input.durationHours, 'Czas trwania');
    if ('error' in normalizedDurationHours) return normalizedDurationHours;
    durationHours = normalizedDurationHours.value;
  } else if (!options.preserveMissingCourtConfig) {
    durationHours = 1;
  }

  return {
    session: {
      cost: totalCost,
      present,
      multiPlayers,
      ...(sport !== undefined ? { sport } : {}),
      ...(courtCount !== undefined ? { courtCount } : {}),
      ...(durationHours !== undefined ? { durationHours } : {}),
      ...(racketCost != null && racketCost > 0 ? { racketCost } : {}),
      ...(ownRacketPlayers.length > 0 ? { ownRacketPlayers } : {}),
    },
  };
}

interface AddSessionParams extends SessionInput {
  datePlayed: string;
}

export async function addSession(params: AddSessionParams): Promise<TransactionResult> {
  if (!isValidISODate(params.datePlayed)) {
    return { success: false, error: 'Nieprawidłowa data sesji' };
  }

  const normalized = normalizeSession(params);
  if ('error' in normalized) return { success: false, error: normalized.error };

  // Id i znacznik czasu ustalamy PRZED transakcją, żeby kolejne próby tego
  // samego zapisu wyglądały identycznie — inaczej Cloud Function widziałaby
  // zmianę `lastAddedSession` i wysyłała powiadomienie po każdej próbie.
  const newId = makeId();
  const addedAt = Date.now();

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];

    // Idempotencja: ponowienie transakcji nie doda drugiej kopii tej sesji.
    if (weeks.some(w => w.id === newId)) return data;
    if (weeks.some(w => w.date === params.datePlayed)) {
      reject('Sesja z tą datą już istnieje');
    }

    return {
      ...data,
      weeks: sortWeeksByDate([...weeks, {
        id: newId,
        date: params.datePlayed,
        ...normalized.session,
        // Nowa sesja zawsze ma sport; opcjonalność w typie dotyczy tylko
        // edycji starego rekordu, która zachowuje dotychczasową wartość.
        sport: normalized.session.sport ?? 'pingpong',
      }]),
      lastAddedSession: { id: newId, ts: addedAt },
    } as RawAppData;
  }, 'Nie udało się zapisać sesji');
}

/** Edycja używa nazw pól tak, jak leżą w bazie (`cost`/`present`), nie jak w formularzu dodawania. */
interface UpdateWeekParams extends Omit<SessionInput, 'totalCost' | 'presentPlayers'> {
  date: string;
  cost: number;
  present: string[];
  multiPlayers?: string[];
}

export async function updateWeek(
  weekId: string,
  params: UpdateWeekParams,
): Promise<TransactionResult> {
  if (!weekId) return { success: false, error: 'Brak identyfikatora sesji' };
  if (!isValidISODate(params.date)) {
    return { success: false, error: 'Nieprawidłowa data sesji' };
  }

  // Edycja przechodzi przez tę samą walidację co dodawanie — wcześniej można
  // było zapisać sesję bez graczy albo z kosztem NaN i wyzerować rozliczenia.
  const normalized = normalizeSession({
    ...params,
    totalCost: params.cost,
    presentPlayers: params.present,
    multisportPlayers: params.multisportPlayers ?? params.multiPlayers,
  }, { preserveMissingCourtConfig: true, preserveMissingSport: true });
  if ('error' in normalized) return { success: false, error: normalized.error };

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];
    const idx = weeks.findIndex(w => w.id === weekId);
    if (idx === -1) reject('Nie znaleziono sesji');

    if (weeks.some(w => w.id !== weekId && w.date === params.date)) {
      reject('Sesja z tą datą już istnieje');
    }

    // Gdy formularz nie podał sportu, zachowujemy dotychczasowy — inaczej
    // edycja squasha/badmintona/padla po cichu zmieniała go na ping-pong.
    const existingSport = weeks[idx].sport;
    const updated: Week = {
      id: weekId,
      date: params.date,
      ...normalized.session,
      sport: normalized.session.sport
        ?? (isSport(existingSport) ? existingSport : 'pingpong'),
    };

    const updatedWeeks = [...weeks];
    updatedWeeks[idx] = updated;
    return { ...data, weeks: sortWeeksByDate(updatedWeeks) } as RawAppData;
  }, 'Nie udało się zaktualizować sesji');
}

export interface DeleteWeekSnapshotResult extends TransactionResult {
  /** Pełny rekord z transakcji — potrzebny, by przywrócić sesję bez utraty pól legacy. */
  deletedWeek?: Week;
}

export async function deleteWeekWithSnapshot(weekId: string): Promise<DeleteWeekSnapshotResult> {
  if (!weekId) return { success: false, error: 'Brak identyfikatora sesji' };

  let deletedWeek: Week | undefined;
  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];
    const found = weeks.find(w => w.id === weekId);

    if (!found) reject('Nie znaleziono sesji do usunięcia');
    // Zapisujemy rekord z bieżącej próby transakcji. Przy ponowieniu Firebase
    // nadpisze snapshot wartością z wersji, która faktycznie się zatwierdzi.
    deletedWeek = found;
    return { ...data, weeks: weeks.filter(w => w.id !== weekId) } as RawAppData;
  }, 'Nie udało się usunąć sesji');

  return result.success && deletedWeek ? { ...result, deletedWeek } : result;
}

/** Wariant bez snapshotu zachowuje dotychczasowy kontrakt dla pozostałych wywołań. */
export async function deleteWeek(weekId: string): Promise<TransactionResult> {
  const result = await deleteWeekWithSnapshot(weekId);
  return {
    success: result.success,
    ...(result.error ? { error: result.error } : {}),
    ...(result.indeterminate ? { indeterminate: true } : {}),
  };
}

/** Przywraca dokładnie usunięty rekord; kolizja daty chroni przed nadpisaniem nowszej sesji. */
export async function restoreWeek(week: Week): Promise<TransactionResult> {
  if (!week || typeof week !== 'object'
    || typeof week.id !== 'string' || week.id.length === 0 || week.id.length > 64
    || !isValidISODate(week.date)) {
    return { success: false, error: 'Nieprawidłowe dane sesji do przywrócenia' };
  }

  const normalized = normalizeSession({
    totalCost: week.cost,
    presentPlayers: week.present,
    multisportPlayers: week.multiPlayers,
    sport: week.sport,
    racketCost: week.racketCost,
    ownRacketPlayers: week.ownRacketPlayers,
    courtCount: week.courtCount,
    durationHours: week.durationHours,
  }, { preserveMissingCourtConfig: true });
  if ('error' in normalized) return { success: false, error: normalized.error };

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];
    if (weeks.some(existing => existing.id === week.id)) return data;
    if (weeks.some(existing => existing.date === week.date)) {
      reject('Nie można przywrócić sesji — istnieje już inna sesja z tą datą');
    }

    // Przywracamy znormalizowany rekord, żeby pola (korty, godziny, rakiety)
    // przeszły przez tę samą walidację co przy edycji — a nie surowy snapshot
    // z bazy, który mógłby nie spełniać reguł.
    // Zachowujemy dodatkowe pola legacy (np. overtimeCost), a znormalizowane
    // wartości nadpisują te, które podlegają walidacji.
    const restored: Week = {
      ...week,
      ...normalized.session,
      id: week.id,
      date: week.date,
      sport: normalized.session.sport || week.sport || 'pingpong',
    };

    return { ...data, weeks: sortWeeksByDate([...weeks, restored]) } as RawAppData;
  }, 'Nie udało się przywrócić sesji');
}
