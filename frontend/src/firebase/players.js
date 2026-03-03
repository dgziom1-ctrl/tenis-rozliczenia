import { requireData } from './state';
import { saveData } from './subscriptions';

export async function addPlayer(name) {
  try {
    const data = requireData();

    if (!name || name.trim().length === 0) {
      throw new Error('Nazwa gracza nie może być pusta');
    }
    if ((data.players || []).includes(name)) {
      throw new Error('Gracz o tej nazwie już istnieje');
    }

    data.players = [...(data.players || []), name];
    data.playerJoinWeek = {
      ...(data.playerJoinWeek || {}),
      [name]: (data.weeks || []).length,
    };

    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error adding player:', error);
    return { success: false, error: error.message || 'Nie udało się dodać gracza' };
  }
}

export async function softDeletePlayer(playerName) {
  try {
    const data = requireData();
    data.players = (data.players || []).filter(p => p !== playerName);
    data.deletedPlayers = [...(data.deletedPlayers || []), playerName];
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error deleting player:', error);
    return { success: false, error: error.message || 'Nie udało się usunąć gracza' };
  }
}

export async function restorePlayer(playerName) {
  try {
    const data = requireData();
    data.deletedPlayers = (data.deletedPlayers || []).filter(p => p !== playerName);
    data.players = [...(data.players || []), playerName];
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error restoring player:', error);
    return { success: false, error: error.message || 'Nie udało się przywrócić gracza' };
  }
}

export async function permanentDeletePlayer(playerName) {
  try {
    const data = requireData();
    data.deletedPlayers = (data.deletedPlayers || []).filter(p => p !== playerName);
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting player:', error);
    return { success: false, error: error.message || 'Nie udało się trwale usunąć gracza' };
  }
}

export async function saveDefaultMulti(playerNames) {
  try {
    const data = requireData();
    data.defaultMultiPlayers = playerNames || [];
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error saving default multi:', error);
    return { success: false, error: error.message || 'Nie udało się zapisać domyślnych multi' };
  }
}
