import { makeId } from '@/utils/id';
import { withTransaction } from '../transaction';
import type { RawAppData, TransactionResult } from '@/types/domain';
import type { Sport } from '@/types/domain';

interface AddSessionParams {
  datePlayed: string;
  totalCost: number;
  presentPlayers: string[];
  multisportPlayers: string[];
  sport?: Sport;
  racketCost?: number;
}

export async function addSession({
  datePlayed,
  totalCost,
  presentPlayers,
  multisportPlayers,
  sport = 'pingpong',
  racketCost,
}: AddSessionParams): Promise<TransactionResult> {
  if (!datePlayed || totalCost < 0 || !presentPlayers || presentPlayers.length === 0) {
    return { success: false, error: 'Nieprawidłowe dane sesji' };
  }

  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
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
          id: newId,
          date: datePlayed,
          cost: totalCost,
          sport,
          present: presentPlayers,
          multiPlayers: multisportPlayers || [],
          ...(racketCost != null && racketCost > 0 ? { racketCost } : {}),
        },
      ],
      lastAddedSession: { id: newId, ts: Date.now() },
    } as RawAppData;
  }, 'Nie udało się zapisać sesji');
}

interface UpdateWeekParams {
  date: string;
  cost: number;
  present: string[];
  multiPlayers: string[];
  sport?: Sport;
  racketCost?: number;
}

export async function updateWeek(
  weekId: string,
  { date, cost, present, multiPlayers, sport, racketCost }: UpdateWeekParams,
): Promise<TransactionResult> {
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];
    const idx = weeks.findIndex(w => w.id === weekId);
    if (idx === -1) throw new Error('Nie znaleziono sesji');

    const updatedWeeks = [...weeks];
    const updated: typeof weeks[0] = {
      id: weekId,
      date,
      cost,
      present,
      multiPlayers: multiPlayers || [],
      sport: sport || weeks[idx].sport || 'pingpong',
    };
    if (racketCost != null && racketCost > 0) {
      updated.racketCost = racketCost;
    }
    updatedWeeks[idx] = updated;
    return { ...data, weeks: updatedWeeks } as RawAppData;
  }, 'Nie udało się zaktualizować sesji');
}

export async function deleteWeek(weekId: string): Promise<TransactionResult> {
  let weekFound = true;

  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const originalWeeks = data.weeks || [];
    const deletedIdx = originalWeeks.findIndex(w => w.id === weekId);

    if (deletedIdx === -1) {
      weekFound = false;
      return data;
    }

    const newWeeks = originalWeeks.filter(w => w.id !== weekId);
    const remainingIds = new Set(newWeeks.map(w => w.id));

    const paidUntilWeek = { ...(data.paidUntilWeek || {}) };
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
    return { ...data, weeks: newWeeks, paidUntilWeek } as RawAppData;
  }, 'Nie udało się usunąć sesji');

  if (result.success && !weekFound) {
    return { success: false, error: 'Week not found' };
  }
  return result;
}
