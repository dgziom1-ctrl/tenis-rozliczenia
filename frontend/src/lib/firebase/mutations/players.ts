import { normalizePlayerName, normalizePlayerList } from '@/utils/validation';
import { withTransaction, reject } from '../transaction';
import type { RawAppData, TransactionResult } from '@/types/domain';

/** Czy pod tym imieniem wisi jakakolwiek historia finansowa lub frekwencyjna. */
function hasLedgerHistory(data: RawAppData, name: string): boolean {
  const hasPayments = (data.payments?.[name] ?? []).length > 0;
  const wasPresent = (data.weeks || []).some(w => (w.present || []).includes(name));
  return hasPayments || wasPresent;
}

export async function addPlayer(name: string): Promise<TransactionResult> {
  const trimmed = normalizePlayerName(name);
  if (!trimmed) {
    return { success: false, error: 'Nazwa gracza nie może być pusta' };
  }

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const players = data.players || [];
    const deleted = data.deletedPlayers || [];

    if (players.includes(trimmed)) reject('Gracz o tej nazwie już istnieje');
    if (deleted.includes(trimmed)) {
      reject('Gracz o tej nazwie jest na liście usuniętych — przywróć go zamiast dodawać ponownie');
    }
    // Imię jest kluczem gracza, więc ponowne użycie imienia z historii
    // odziedziczyłoby cudze saldo i wpłaty.
    if (hasLedgerHistory(data, trimmed)) {
      reject('Gracz o tej nazwie występuje już w historii rozliczeń — wybierz inne imię');
    }

    return {
      ...data,
      players: [...players, trimmed],
      playerJoinWeek: {
        ...(data.playerJoinWeek || {}),
        [trimmed]: (data.weeks || []).length,
      },
    } as RawAppData;
  }, 'Nie udało się dodać gracza');
}

export async function softDeletePlayer(playerName: string): Promise<TransactionResult> {
  const name = normalizePlayerName(playerName);
  if (!name) return { success: false, error: 'Nie wybrano gracza' };

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const players = data.players || [];
    if (!players.includes(name)) reject('Nie znaleziono gracza');

    const deleted = data.deletedPlayers || [];
    return {
      ...data,
      players: players.filter(p => p !== name),
      deletedPlayers: deleted.includes(name) ? deleted : [...deleted, name],
    } as RawAppData;
  }, 'Nie udało się usunąć gracza');
}

export async function restorePlayer(playerName: string): Promise<TransactionResult> {
  const name = normalizePlayerName(playerName);
  if (!name) return { success: false, error: 'Nie wybrano gracza' };

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const players = data.players || [];

    return {
      ...data,
      deletedPlayers: (data.deletedPlayers || []).filter(p => p !== name),
      // Bez tego sprawdzenia gracz mógł trafić na listę dwa razy i liczyć się podwójnie.
      players: players.includes(name) ? players : [...players, name],
    } as RawAppData;
  }, 'Nie udało się przywrócić gracza');
}

/**
 * Trwale usuwa gracza razem z jego wpłatami i datą dołączenia.
 *
 * Blokujemy usunięcie, gdy gracz brał udział w sesjach — jego udział jest
 * wliczony w koszty tamtych rozgrywek, a usunięcie zapisu przeliczyłoby
 * historyczne kwoty pozostałych graczy.
 */
export async function permanentDeletePlayer(playerName: string): Promise<TransactionResult> {
  const name = normalizePlayerName(playerName);
  if (!name) return { success: false, error: 'Nie wybrano gracza' };

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;

    if ((data.weeks || []).some(w => (w.present || []).includes(name))) {
      reject('Nie można trwale usunąć gracza, który brał udział w sesjach — pozostaw go na liście usuniętych');
    }

    const payments = { ...(data.payments || {}) };
    delete payments[name];
    const playerJoinWeek = { ...(data.playerJoinWeek || {}) };
    delete playerJoinWeek[name];

    return {
      ...data,
      players: (data.players || []).filter(p => p !== name),
      deletedPlayers: (data.deletedPlayers || []).filter(p => p !== name),
      payments,
      playerJoinWeek,
    } as RawAppData;
  }, 'Nie udało się trwale usunąć gracza');
}

export async function saveDefaultMulti(playerNames: string[]): Promise<TransactionResult> {
  const names = normalizePlayerList(playerNames);

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    return {
      ...data,
      // Zapisujemy tylko graczy, którzy nadal istnieją.
      defaultMultiPlayers: names.filter(n => (data.players || []).includes(n)),
    } as RawAppData;
  }, 'Nie udało się zapisać domyślnych multi');
}
