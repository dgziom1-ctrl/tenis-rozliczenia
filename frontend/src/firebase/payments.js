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
      const data  = current || {};
      const weeks = data.weeks || [];

      if (weeks.length === 0) {
        throw new Error('Brak sesji do rozliczenia');
      }

      previousValue    = data.paidUntilWeek?.[playerName] ?? null;
      previousPayments = data.payments?.[playerName] ?? [];

      // Calculate outstanding debt: sessions after paidUntilWeek cutoff
      const paidUntilId  = data.paidUntilWeek?.[playerName];
      const cutoffIdx    = paidUntilId ? weeks.findIndex(w => w.id === paidUntilId) : -1;
      const unpaidWeeks  = weeks.slice(cutoffIdx + 1);
      const debtAmount   = unpaidWeeks.reduce((sum, w) => {
        const isPresent    = (w.present     || []).includes(playerName);
        const isMultisport = (w.multiPlayers || []).includes(playerName);
        if (!isPresent || isMultisport) return sum;
        const payers = (w.present || []).filter(p => !(w.multiPlayers || []).includes(p));
        return sum + (payers.length > 0 ? w.cost / payers.length : 0);
      }, 0);

      // How much the player already paid (partial payments)
      const alreadyPaid = (data.payments?.[playerName] || [])
        .reduce((s, p) => s + (p.amount || 0), 0);

      // Net amount being settled now (could be 0 if overpaid)
      const settleAmount = Math.round((debtAmount - alreadyPaid) * 100) / 100;

      // Keep existing payments; add a settlement entry only when there is a
      // positive amount being settled (not for zero-debt or credit situations)
      const existingPayments = data.payments?.[playerName] ?? [];
      const settleEntry = settleAmount > 0
        ? [{ id: makeId(), amount: settleAmount, date: new Date().toISOString().split('T')[0] }]
        : [];

      return {
        ...data,
        paidUntilWeek: {
          ...(data.paidUntilWeek || {}),
          [playerName]: weeks[weeks.length - 1].id,
        },
        payments: {
          ...(data.payments || {}),
          [playerName]: [...existingPayments, ...settleEntry],
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
