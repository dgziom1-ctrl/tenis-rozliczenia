import { makeId, todayISO } from '../utils/id';
import { withTransaction } from './utils';
import { ref, set } from 'firebase/database';
import { database } from './config';

export async function addSession({ datePlayed, totalCost, presentPlayers, multisportPlayers }) {
  if (!datePlayed || totalCost < 0 || !presentPlayers || presentPlayers.length === 0) {
    return { success: false, error: 'Nieprawidłowe dane sesji' };
  }

  // Przechwytujemy ID sesji na zewnątrz transakcji, żeby móc go użyć
  // do zapisu triggera po zatwierdzeniu transakcji.
  // runTransaction może wywołać callback wielokrotnie (retry) — za każdym
  // razem generujemy nowe ID, a 'newSessionId' zawsze ma wartość z ostatniego,
  // zatwierdzonego wywołania.
  let newSessionId = null;

  const result = await withTransaction((current) => {
    const data  = current || {};
    const weeks = data.weeks || [];

    if (weeks.some(w => w.date === datePlayed)) {
      throw new Error('Sesja z tą datą już istnieje');
    }

    newSessionId = makeId();

    return {
      ...data,
      weeks: [
        ...weeks,
        {
          id:           newSessionId,
          date:         datePlayed,
          cost:         totalCost,
          present:      presentPlayers,
          multiPlayers: multisportPlayers || [],
        },
      ],
    };
  }, 'Nie udało się zapisać sesji');

  // Zapisz trigger dla Cloud Function.
  // onValueCreated na /notifications/pending/{id} odpala się ZAWSZE — raz
  // per nowy węzeł, niezależnie od poprzednich operacji na /appData.
  // Dzięki temu powiadomienie działa też gdy sesja jest dodawana ponownie
  // po wcześniejszym usunięciu (np. ta sama data, nowe ID).
  if (result.success && newSessionId) {
    try {
      await set(ref(database, `notifications/pending/${newSessionId}`), {
        sessionId: newSessionId,
        date:      datePlayed,
        ts:        Date.now(),
      });
    } catch (err) {
      // Brak triggera = brak powiadomień, ale sesja już jest zapisana —
      // nie blokujemy użytkownika, tylko logujemy błąd.
      console.error('Nie udało się zapisać triggera powiadomienia:', err);
    }
  }

  return result;
}

export async function updateWeek(weekId, { date, cost, present, multiPlayers }) {
  return withTransaction((current) => {
    const data  = current || {};
    const weeks = data.weeks || [];
    const idx   = weeks.findIndex(w => w.id === weekId);

    if (idx === -1) throw new Error('Nie znaleziono sesji');

    const updatedWeeks = [...weeks];
    updatedWeeks[idx]  = { id: weekId, date, cost, present, multiPlayers: multiPlayers || [] };

    return { ...data, weeks: updatedWeeks };
  }, 'Nie udało się zaktualizować sesji');
}

export async function deleteWeek(weekId) {
  return withTransaction((current) => {
    const data          = current || {};
    const originalWeeks = data.weeks || [];
    const deletedIdx    = originalWeeks.findIndex(w => w.id === weekId);

    if (deletedIdx === -1) return; // nothing to delete — abort write

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
  }, 'Nie udało się usunąć sesji');
}
