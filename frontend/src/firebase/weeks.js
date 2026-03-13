import { runTransaction } from 'firebase/database';
import { dataRef } from './config';
import { makeId } from '../utils/id';

export async function addSession({ datePlayed, totalCost, presentPlayers, multisportPlayers }) {
  try {
    if (!datePlayed || totalCost < 0 || !presentPlayers || presentPlayers.length === 0) {
      throw new Error('Nieprawidłowe dane sesji');
    }

    let transactionError = null;

    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const weeks = data.weeks || [];

      if (weeks.some(w => w.date === datePlayed)) {
        transactionError = 'Sesja z tą datą już istnieje';
        return; // abort transaction
      }

      return {
        ...data,
        weeks: [
          ...weeks,
          {
            id: makeId(),
            date: datePlayed,
            cost: totalCost,
            present: presentPlayers,
            multiPlayers: multisportPlayers || [],
          },
        ],
      };
    });

    if (transactionError) throw new Error(transactionError);
    return { success: true };
  } catch (error) {
    console.error('Error adding session:', error);
    return { success: false, error: error.message || 'Nie udało się zapisać sesji' };
  }
}

export async function updateWeek(weekId, { date, cost, present, multiPlayers }) {
  try {
    let notFound = false;

    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const weeks = data.weeks || [];
      const idx = weeks.findIndex(w => w.id === weekId);

      if (idx === -1) {
        notFound = true;
        return; // abort
      }

      const updatedWeeks = [...weeks];
      updatedWeeks[idx] = { id: weekId, date, cost, present, multiPlayers: multiPlayers || [] };

      return { ...data, weeks: updatedWeeks };
    });

    if (notFound) throw new Error('Nie znaleziono sesji');
    return { success: true };
  } catch (error) {
    console.error('Error updating week:', error);
    return { success: false, error: error.message || 'Nie udało się zaktualizować sesji' };
  }
}

export async function deleteWeek(weekId) {
  try {
    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const originalWeeks = data.weeks || [];
      const deletedIdx    = originalWeeks.findIndex(w => w.id === weekId);

      if (deletedIdx === -1) return; // abort — nothing to do, skip write

      const newWeeks     = originalWeeks.filter(w => w.id !== weekId);
      const remainingIds = new Set(newWeeks.map(w => w.id));

      let paidUntilWeek = { ...(data.paidUntilWeek || {}) };
      for (const [player, paidId] of Object.entries(paidUntilWeek)) {
        if (!remainingIds.has(paidId)) {
          const predecessor = originalWeeks
            .slice(0, deletedIdx)
            .reverse()
            .find(w => remainingIds.has(w.id));
          if (predecessor) {
            paidUntilWeek[player] = predecessor.id;
          } else {
            delete paidUntilWeek[player];
          }
        }
      }

      return { ...data, weeks: newWeeks, paidUntilWeek };
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting week:', error);
    return { success: false, error: error.message || 'Nie udało się usunąć sesji' };
  }
}
