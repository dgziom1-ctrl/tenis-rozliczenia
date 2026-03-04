import { requireData } from './state';
import { saveData } from './subscriptions';

export async function addSession({ datePlayed, totalCost, presentPlayers, multisportPlayers }) {
  try {
    const data = JSON.parse(JSON.stringify(requireData()));

    if (!datePlayed || totalCost < 0 || !presentPlayers || presentPlayers.length === 0) {
      throw new Error('Nieprawidłowe dane sesji');
    }

    data.weeks = [
      ...(data.weeks || []),
      {
        id: Date.now().toString(36),
        date: datePlayed,
        cost: totalCost,
        present: presentPlayers,
        multiPlayers: multisportPlayers || [],
      },
    ];

    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error adding session:', error);
    return { success: false, error: error.message || 'Nie udało się zapisać sesji' };
  }
}

export async function updateWeek(weekId, { date, cost, present, multiPlayers }) {
  try {
    const data = JSON.parse(JSON.stringify(requireData()));
    const idx = (data.weeks || []).findIndex(w => w.id === weekId);

    if (idx === -1) throw new Error('Nie znaleziono sesji');

    data.weeks[idx] = { id: weekId, date, cost, present, multiPlayers: multiPlayers || [] };
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating week:', error);
    return { success: false, error: error.message || 'Nie udało się zaktualizować sesji' };
  }
}

export async function deleteWeek(weekId) {
  try {
    const data = JSON.parse(JSON.stringify(requireData()));
    data.weeks = (data.weeks || []).filter(w => w.id !== weekId);
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error deleting week:', error);
    return { success: false, error: error.message || 'Nie udało się usunąć sesji' };
  }
}
