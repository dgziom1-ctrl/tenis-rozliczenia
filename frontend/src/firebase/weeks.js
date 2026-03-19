import { makeId } from '../utils/id';
import { withTransaction } from './utils';

export async function addSession({ datePlayed, totalCost, presentPlayers, multisportPlayers }) {
  if (!datePlayed || totalCost < 0 || !presentPlayers || presentPlayers.length === 0) {
    return { success: false, error: 'Nieprawidłowe dane sesji' };
  }

  // Trigger dla Cloud Function jest zapisywany WEWNĄTRZ tej samej transakcji
  // jako pole lastAddedSession w /appData.
  //
  // Dlaczego nie osobna ścieżka (/notifications/pending):
  //   - zapis do osobnej ścieżki wymaga dodatkowych reguł RTDB po stronie klienta
  //   - jeśli reguły nie pozwalają na zapis, trigger nigdy nie dotrze do funkcji
  //
  // Dlaczego wewnątrz transakcji:
  //   - jeden atomowy zapis do Firebase = jedno onValueUpdated event
  //   - lastAddedSession.id zmienia się przy KAŻDYM dodaniu sesji,
  //     nawet jeśli sesja z tą samą datą była wcześniej usunięta
  //   - Cloud Function porównuje before.lastAddedSession.id vs after.lastAddedSession.id
  //     zamiast szukać "nowych" wierszy po ID — ta metoda jest 100% niezawodna
  //
  // runTransaction może wywołać callback wielokrotnie (retry) —
  // makeId() generuje nowe ID przy każdym wywołaniu, więc lastAddedSession
  // zawsze ma ID ostatniego, zatwierdzonego wywołania.

  return withTransaction((current) => {
    const data  = current || {};
    const weeks = data.weeks || [];

    if (weeks.some(w => w.date === datePlayed)) {
      throw new Error('Sesja z tą datą już istnieje');
    }

    const newId = makeId();

    return {
      ...data,
      weeks: [
        ...weeks,
        {
          id:           newId,
          date:         datePlayed,
          cost:         totalCost,
          present:      presentPlayers,
          multiPlayers: multisportPlayers || [],
        },
      ],
      // Trigger dla onValueUpdated w Cloud Function.
      // Zmiana tego pola = sygnał ze nowa sesja zostala dodana.
      // ts zapewnia ze pole sie zawsze zmienia.
      lastAddedSession: { id: newId, ts: Date.now() },
    };
  }, 'Nie udało się zapisać sesji');
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
