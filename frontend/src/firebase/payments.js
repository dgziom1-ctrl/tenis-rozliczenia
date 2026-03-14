import { makeId, todayISO } from '../utils/id';
import { calculateDebt, roundToTwoDecimals } from '../utils/calculations';
import { withTransaction } from './utils';

export async function settlePlayer(playerName) {
  let previousValue    = null;
  let previousPayments = [];

  const result = await withTransaction((current) => {
    const data  = current || {};
    const weeks = data.weeks || [];

    if (weeks.length === 0) throw new Error('Brak sesji do rozliczenia');

    previousValue    = data.paidUntilWeek?.[playerName] ?? null;
    previousPayments = data.payments?.[playerName] ?? [];

    // calculateDebt already accounts for existing payments, so this is the net amount owed
    const debtAmount   = calculateDebt(playerName, { weeks, paidUntilWeek: data.paidUntilWeek, payments: data.payments });
    const settleAmount = roundToTwoDecimals(debtAmount);

    const existingPayments = data.payments?.[playerName] ?? [];
    const settleEntry = settleAmount > 0
      ? [{ id: makeId(), amount: settleAmount, date: todayISO() }]
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
  }, 'Nie udało się rozliczyć gracza');

  return result.success ? { ...result, previousValue, previousPayments } : result;
}

export async function undoSettle(playerName, previousValue, previousPayments) {
  return withTransaction((current) => {
    const data          = current || {};
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
  }, 'Nie udało się cofnąć rozliczenia');
}

export async function addPayment(playerName, amount) {
  const paymentId = makeId();

  const result = await withTransaction((current) => {
    const data     = current || {};
    const existing = data.payments?.[playerName] ?? [];

    return {
      ...data,
      payments: {
        ...(data.payments || {}),
        [playerName]: [
          ...existing,
          {
            id:     paymentId,
            amount: roundToTwoDecimals(amount),
            date:   todayISO(),
          },
        ],
      },
    };
  }, 'Nie udało się dodać wpłaty');

  return result.success ? { ...result, paymentId } : result;
}

export async function removePayment(playerName, paymentId) {
  return withTransaction((current) => {
    const data = current || {};
    if (!data.payments?.[playerName]) return data;

    return {
      ...data,
      payments: {
        ...data.payments,
        [playerName]: data.payments[playerName].filter(p => p.id !== paymentId),
      },
    };
  }, 'Nie udało się cofnąć wpłaty');
}
