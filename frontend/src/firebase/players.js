import { withTransaction } from './utils';

export async function addPlayer(name) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Nazwa gracza nie może być pusta' };
  }
  const trimmed = name.trim();

  return withTransaction((current) => {
    const data    = current || {};
    const players = data.players || [];

    if (players.includes(trimmed)) throw new Error('Gracz o tej nazwie już istnieje');

    return {
      ...data,
      players: [...players, trimmed],
      playerJoinWeek: {
        ...(data.playerJoinWeek || {}),
        [trimmed]: (data.weeks || []).length,
      },
    };
  }, 'Nie udało się dodać gracza');
}

export async function softDeletePlayer(playerName) {
  return withTransaction((current) => {
    const data = current || {};
    return {
      ...data,
      players:        (data.players || []).filter(p => p !== playerName),
      deletedPlayers: [...(data.deletedPlayers || []), playerName],
    };
  }, 'Nie udało się usunąć gracza');
}

export async function restorePlayer(playerName) {
  return withTransaction((current) => {
    const data = current || {};
    return {
      ...data,
      deletedPlayers: (data.deletedPlayers || []).filter(p => p !== playerName),
      players:        [...(data.players || []), playerName],
    };
  }, 'Nie udało się przywrócić gracza');
}

export async function permanentDeletePlayer(playerName) {
  return withTransaction((current) => {
    const data = current || {};
    return {
      ...data,
      deletedPlayers: (data.deletedPlayers || []).filter(p => p !== playerName),
    };
  }, 'Nie udało się trwale usunąć gracza');
}

export async function saveDefaultMulti(playerNames) {
  return withTransaction((current) => ({
    ...(current || {}),
    defaultMultiPlayers: playerNames || [],
  }), 'Nie udało się zapisać domyślnych multi');
}
