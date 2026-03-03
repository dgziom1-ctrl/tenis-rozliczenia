import { requireData } from './state';
import { saveData } from './subscriptions';

export async function settlePlayer(playerName) {
  try {
    const data = requireData();
    const weeks = data.weeks || [];

    if (weeks.length === 0) {
      throw new Error('Brak sesji do rozliczenia');
    }

    const previousValue = data.paidUntilWeek?.[playerName] ?? null;

    data.paidUntilWeek = {
      ...(data.paidUntilWeek || {}),
      [playerName]: weeks[weeks.length - 1].id,
    };

    await saveData(data);
    return { success: true, previousValue };
  } catch (error) {
    console.error('Error settling player:', error);
    return { success: false, error: error.message || 'Nie udało się rozliczyć gracza' };
  }
}

export async function undoSettle(playerName, previousValue) {
  try {
    const data = requireData();
    const paid = { ...(data.paidUntilWeek || {}) };

    if (previousValue === null) {
      delete paid[playerName];
    } else {
      paid[playerName] = previousValue;
    }

    data.paidUntilWeek = paid;
    await saveData(data);
    return { success: true };
  } catch (error) {
    console.error('Error undoing settle:', error);
    return { success: false, error: error.message || 'Nie udało się cofnąć rozliczenia' };
  }
}
