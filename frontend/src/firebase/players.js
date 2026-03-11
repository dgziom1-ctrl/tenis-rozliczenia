import { runTransaction } from 'firebase/database';
import { dataRef } from './config';

export async function addPlayer(name) {
  try {
    if (!name || name.trim().length === 0) {
      throw new Error('Nazwa gracza nie może być pusta');
    }
    const trimmed = name.trim();
    let duplicateError = null;

    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const players = data.players || [];

      if (players.includes(trimmed)) {
        duplicateError = 'Gracz o tej nazwie już istnieje';
        return; // abort
      }

      return {
        ...data,
        players: [...players, trimmed],
        playerJoinWeek: {
          ...(data.playerJoinWeek || {}),
          [trimmed]: (data.weeks || []).length,
        },
      };
    });

    if (duplicateError) throw new Error(duplicateError);
    return { success: true };
  } catch (error) {
    console.error('Error adding player:', error);
    return { success: false, error: error.message || 'Nie udało się dodać gracza' };
  }
}

export async function softDeletePlayer(playerName) {
  try {
    await runTransaction(dataRef, (current) => {
      const data = current || {};
      return {
        ...data,
        players:        (data.players || []).filter(p => p !== playerName),
        deletedPlayers: [...(data.deletedPlayers || []), playerName],
      };
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting player:', error);
    return { success: false, error: error.message || 'Nie udało się usunąć gracza' };
  }
}

export async function restorePlayer(playerName) {
  try {
    await runTransaction(dataRef, (current) => {
      const data = current || {};
      return {
        ...data,
        deletedPlayers: (data.deletedPlayers || []).filter(p => p !== playerName),
        players:        [...(data.players || []), playerName],
      };
    });

    return { success: true };
  } catch (error) {
    console.error('Error restoring player:', error);
    return { success: false, error: error.message || 'Nie udało się przywrócić gracza' };
  }
}

export async function permanentDeletePlayer(playerName) {
  try {
    await runTransaction(dataRef, (current) => {
      const data = current || {};
      return {
        ...data,
        deletedPlayers: (data.deletedPlayers || []).filter(p => p !== playerName),
      };
    });

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting player:', error);
    return { success: false, error: error.message || 'Nie udało się trwale usunąć gracza' };
  }
}

export async function saveDefaultMulti(playerNames) {
  try {
    await runTransaction(dataRef, (current) => {
      return { ...(current || {}), defaultMultiPlayers: playerNames || [] };
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving default multi:', error);
    return { success: false, error: error.message || 'Nie udało się zapisać domyślnych multi' };
  }
}
