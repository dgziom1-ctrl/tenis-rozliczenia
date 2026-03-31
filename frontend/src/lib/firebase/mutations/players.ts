import { withTransaction } from '../transaction';
import type { RawAppData, TransactionResult } from '@/types/domain';

export async function addPlayer(name: string): Promise<TransactionResult> {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Nazwa gracza nie może być pusta' };
  }
  const trimmed = name.trim();

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const players = data.players || [];
    if (players.includes(trimmed)) throw new Error('Gracz o tej nazwie już istnieje');

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
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    return {
      ...data,
      players: (data.players || []).filter(p => p !== playerName),
      deletedPlayers: [...(data.deletedPlayers || []), playerName],
    } as RawAppData;
  }, 'Nie udało się usunąć gracza');
}

export async function restorePlayer(playerName: string): Promise<TransactionResult> {
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    return {
      ...data,
      deletedPlayers: (data.deletedPlayers || []).filter(p => p !== playerName),
      players: [...(data.players || []), playerName],
    } as RawAppData;
  }, 'Nie udało się przywrócić gracza');
}

export async function permanentDeletePlayer(playerName: string): Promise<TransactionResult> {
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    return {
      ...data,
      deletedPlayers: (data.deletedPlayers || []).filter(p => p !== playerName),
    } as RawAppData;
  }, 'Nie udało się trwale usunąć gracza');
}

export async function saveDefaultMulti(playerNames: string[]): Promise<TransactionResult> {
  return withTransaction((current) => ({
    ...((current || {}) as RawAppData),
    defaultMultiPlayers: playerNames || [],
  } as RawAppData), 'Nie udało się zapisać domyślnych multi');
}
