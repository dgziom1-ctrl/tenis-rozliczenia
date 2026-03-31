import { makeId, todayISO } from '@/utils/id';
import { calculateDebt, roundToTwoDecimals } from '@/utils/debt';
import { withTransaction } from '../transaction';
import type { RawAppData, TransactionResult, SettleResult, AddPaymentResult, Payment } from '@/types/domain';

export async function settlePlayer(playerName: string): Promise<SettleResult> {
  let previousValue: string | null = null;
  let previousPayments: Payment[] = [];

  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const weeks = data.weeks || [];
    if (weeks.length === 0) throw new Error('Brak sesji do rozliczenia');

    previousValue = data.paidUntilWeek?.[playerName] ?? null;
    previousPayments = data.payments?.[playerName] ?? [];

    const debtAmount = calculateDebt(playerName, { weeks, paidUntilWeek: data.paidUntilWeek, payments: data.payments });
    const settleAmount = roundToTwoDecimals(debtAmount);
    const existingPayments = data.payments?.[playerName] ?? [];
    const settleEntry: Payment[] = settleAmount > 0
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
    } as RawAppData;
  }, 'Nie udało się rozliczyć gracza');

  return result.success ? { ...result, previousValue, previousPayments } : result;
}

export async function undoSettle(
  playerName: string,
  previousValue: string | null,
  previousPayments: Payment[],
): Promise<TransactionResult> {
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
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
    } as RawAppData;
  }, 'Nie udało się cofnąć rozliczenia');
}

export async function addPayment(playerName: string, amount: number): Promise<AddPaymentResult> {
  if (typeof playerName !== 'string' || playerName.trim() === '') {
    return { success: false, error: 'Invalid input' };
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'Invalid input' };
  }

  const paymentId = makeId();

  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const existing = data.payments?.[playerName] ?? [];

    return {
      ...data,
      payments: {
        ...(data.payments || {}),
        [playerName]: [
          ...existing,
          { id: paymentId, amount: roundToTwoDecimals(amount), date: todayISO() },
        ],
      },
    } as RawAppData;
  }, 'Nie udało się dodać wpłaty');

  return result.success ? { ...result, paymentId } : result;
}

export async function removePayment(playerName: string, paymentId: string): Promise<TransactionResult> {
  let paymentFound = true;

  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    if (!data.payments?.[playerName]) {
      paymentFound = false;
      return data;
    }
    const existing = data.payments[playerName];
    if (!existing.some(p => p.id === paymentId)) {
      paymentFound = false;
      return data;
    }
    return {
      ...data,
      payments: {
        ...data.payments,
        [playerName]: existing.filter(p => p.id !== paymentId),
      },
    } as RawAppData;
  }, 'Nie udało się cofnąć wpłaty');

  if (result.success && !paymentFound) {
    return { success: false, error: 'Payment not found' };
  }
  return result;
}
