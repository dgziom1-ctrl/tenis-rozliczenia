import { runTransaction } from 'firebase/database';
import { dataRef } from './config';

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function settlePlayer(playerName) {
  try {
    let previousValue    = null;
    let previousPayments = [];

    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const weeks = data.weeks || [];

      if (weeks.length === 0) {
        throw new Error('Brak sesji do rozliczenia');
      }

      previousValue    = data.paidUntilWeek?.[playerName] ?? null;
      previousPayments = data.payments?.[playerName] ?? [];

      return {
        ...data,
        paidUntilWeek: {
          ...(data.paidUntilWeek || {}),
          [playerName]: weeks[weeks.length - 1].id,
        },
        payments: {
          ...(data.payments || {}),
          [playerName]: [], // Clear — debt fully settled
        },
      };
    });

    return { success: true, previousValue, previousPayments };
  } catch (error) {
    console.error('Error settling player:', error);
    return { success: false, error: error.message || 'Nie udało się rozliczyć gracza' };
  }
}

export async function undoSettle(playerName, previousValue, previousPayments) {
  try {
    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const paidUntilWeek = { ...(data.paidUntilWeek || {}) };

      if (previousValue === null) {
        delete paidUntilWeek[playerName];
      } else {
        paidUntilWeek[playerName] = previousValue;
      }

      return {
        ...data,
        paidUntilWeek,
        payments: {
          ...(data.payments || {}),
          [playerName]: previousPayments ?? [],
        },
      };
    });

    return { success: true };
  } catch (error) {
    console.error('Error undoing settle:', error);
    return { success: false, error: error.message || 'Nie udało się cofnąć rozliczenia' };
  }
}

export async function addPayment(playerName, amount) {
  try {
    const paymentId = makeId();

    await runTransaction(dataRef, (current) => {
      const data = current || {};
      const existing = data.payments?.[playerName] ?? [];

      return {
        ...data,
        payments: {
          ...(data.payments || {}),
          [playerName]: [
            ...existing,
            {
              id:     paymentId,
              amount: Math.round(amount * 100) / 100,
              date:   new Date().toISOString().split('T')[0],
            },
          ],
        },
      };
    });

    return { success: true, paymentId };
  } catch (error) {
    console.error('Error adding payment:', error);
    return { success: false, error: error.message || 'Nie udało się dodać wpłaty' };
  }
}

export async function removePayment(playerName, paymentId) {
  try {
    await runTransaction(dataRef, (current) => {
      const data = current || {};
      if (!data.payments?.[playerName]) return data;

      return {
        ...data,
        payments: {
          ...(data.payments),
          [playerName]: data.payments[playerName].filter(p => p.id !== paymentId),
        },
      };
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing payment:', error);
    return { success: false, error: error.message };
  }
}
