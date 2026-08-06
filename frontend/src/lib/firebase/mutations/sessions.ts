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
  overtimePlayers?: string[];
  overtimeCost?: number;
}

interface NormalizedSession {
  cost: number;
  present: string[];
  multiPlayers: string[];
  sport: Sport;
  racketCost?: number;
  ownRacketPlayers?: string[];
  overtimePlayers?: string[];
  overtimeCost?: number;
}

/**
 * Sprowadza dane sesji do postaci zapisywanej w bazie i odrzuca wszystko, co
 * mogłoby zepsuć rozliczenia: NaN, Infinity, kwoty ujemne, puste listy graczy,
 * duplikaty imion oraz graczy spoza listy obecnych.
 *
 * Zwraca komunikat błędu zamiast rzucać, żeby wywołujący mógł go pokazać.
 */
const SPORTS: readonly Sport[] = ['pingpong', 'squash', 'badminton'];

function isSport(value: unknown): value is Sport {
  return typeof value === 'string' && (SPORTS as readonly string[]).includes(value);
}

function normalizeSession(input: SessionInput): { session: NormalizedSession } | { error: string } {
  const { totalCost, sport = 'pingpong' } = input;

  if (!isValidMoney(totalCost)) {
    return { error: 'Koszt sesji musi być liczbą nieujemną' };
  }

  // Reguły bazy przepuszczają tylko te trzy wartości. Bez sprawdzenia tutaj
  // zapis wracałby jako „permission denied" bez czytelnego powodu.
  if (!isSport(sport)) {
    return { error: 'Nieznana dyscyplina sportu' };
  }

  const present = normalizePlayerList(input.presentPlayers);
  if (present.length === 0) {
    return { error: 'Zaznacz przynajmniej jednego obecnego gracza' };
  }

  // Gracz spoza listy obecnych nie może mieć karty, rakiety ani dogrywki.
  const multiPlayers = normalizePlayerList(input.multisportPlayers).filter(p => present.includes(p));
  const ownRacketPlayers = normalizePlayerList(input.ownRacketPlayers).filter(p => present.includes(p));
  const overtimePlayers = normalizePlayerList(input.overtimePlayers).filter(p => present.includes(p));

  const racketCost = input.racketCost;
  if (racketCost != null && !isValidMoney(racketCost)) {
    return { error: 'Koszt rakiet musi być liczbą nieujemną' };
  }
  if (racketCost != null && racketCost > totalCost) {
    return { error: 'Koszt rakiet nie może przekraczać kosztu sesji' };
  }

  const overtimeCost = input.overtimeCost;
  if (overtimeCost != null && !isValidMoney(overtimeCost)) {
    return { error: 'Koszt dogrywki musi być liczbą nieujemną' };
  }

  const hasOvertime = overtimePlayers.length > 0 && overtimeCost != null && overtimeCost > 0;

  return {
    session: {
      cost: totalCost,
      present,
      multiPlayers,
      sport,
      ...(racketCost != null && racketCost > 0 ? { racketCost } : {}),
      ...(ownRacketPlayers.length > 0 ? { ownRacketPlayers } : {}),
      ...(hasOvertime ? { overtimePlayers, overtimeCost } : {}),
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
      weeks: sortWeeksByDate([...weeks, { id: newId, date: params.datePlayed, ...normalized.session }]),
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
  });
  if ('error' in normalized) return { success: false, error: normalized.error };

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];
    const idx = weeks.findIndex(w => w.id === weekId);
    if (idx === -1) reject('Nie znaleziono sesji');

    if (weeks.some(w => w.id !== weekId && w.date === params.date)) {
      reject('Sesja z tą datą już istnieje');
    }

    const updated: Week = {
      id: weekId,
      date: params.date,
      ...normalized.session,
      sport: normalized.session.sport || weeks[idx].sport || 'pingpong',
    };

    const updatedWeeks = [...weeks];
    updatedWeeks[idx] = updated;
    return { ...data, weeks: sortWeeksByDate(updatedWeeks) } as RawAppData;
  }, 'Nie udało się zaktualizować sesji');
}

export async function deleteWeek(weekId: string): Promise<TransactionResult> {
  if (!weekId) return { success: false, error: 'Brak identyfikatora sesji' };

  // „Nie znaleziono" zgłaszamy przerwaniem transakcji, a nie flagą na zewnątrz —
  // flaga z próby, która się nie zatwierdziła, przeżywała ponowienie i potrafiła
  // zgłosić błąd po usunięciu, które faktycznie doszło do skutku.
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];

    if (!weeks.some(w => w.id === weekId)) {
      reject('Nie znaleziono sesji do usunięcia');
    }

    return { ...data, weeks: weeks.filter(w => w.id !== weekId) } as RawAppData;
  }, 'Nie udało się usunąć sesji');
}
