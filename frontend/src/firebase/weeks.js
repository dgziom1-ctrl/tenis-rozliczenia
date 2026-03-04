import { requireData } from './state';
import { saveData } from './subscriptions';

export async function addSession({ datePlayed, totalCost, presentPlayers, multisportPlayers }) {
  try {
    const data = JSON.parse(JSON.stringify(requireData()));

    if (!datePlayed || totalCost < 0 || !presentPlayers || presentPlayers.length === 0) {
      throw new Error('Nieprawidłowe dane sesji');
    }
    if ((data.weeks || []).some(w => w.date === datePlayed)) {
      throw new Error('Sesja z tą datą już istnieje');
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

    // Clean up paidUntilWeek entries pointing to the deleted session.
    // If a player's "last paid" week is deleted, find the latest remaining
    // week that still comes before their old paid position.
    const remainingIds = new Set((data.weeks || []).map(w => w.id));
    if (data.paidUntilWeek) {
      for (const [player, paidId] of Object.entries(data.paidUntilWeek)) {
        if (!remainingIds.has(paidId)) {
          // Walk backwards through remaining weeks to find the closest predecessor
          const originalWeeks = requireData().weeks || [];
          const deletedIdx = originalWeeks.findIndex(w => w.id === weekId);
          const predecessor = originalWeeks
            .slice(0, deletedIdx)
            .reverse()
            .find(w => remainingIds.has(w.id));
          if (predecessor) {
            data.paidUntilWeek[player] = predecessor.id;
          } else {
            delete data.paidUntilWeek[player];
          }
        }
      }
    }

    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error deleting week:', error);
    return { success: false, error: error.message || 'Nie udało się usunąć sesji' };
  }
}
