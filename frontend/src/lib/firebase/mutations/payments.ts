import { makeId, todayISO } from '@/utils/id';
import { toGrosze, toZloty } from '@/utils/money';
import { isPositiveMoney, normalizePlayerName } from '@/utils/validation';
import { withTransaction } from '../transaction';
import type { RawAppData, TransactionResult, AddPaymentResult, Payment } from '@/types/domain';

export async function addPayment(
  playerName: string,
  amount: number,
  /** Przekaż stałe id, aby ponowienie po nieudanym zapisie nie zdublowało wpłaty. */
  paymentId: string = makeId(),
): Promise<AddPaymentResult> {
  const name = normalizePlayerName(playerName);
  if (!name) return { success: false, error: 'Nie wybrano gracza' };
  if (!isPositiveMoney(amount)) {
    return { success: false, error: 'Wpisz poprawną kwotę (większą od 0)' };
  }

  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const existing = data.payments?.[name] ?? [];

    // Idempotencja: to samo id nigdy nie zostanie dopisane dwa razy, więc
    // ponowienie po timeoucie nie policzy wpłaty podwójnie.
    if (existing.some(p => p.id === paymentId)) return data;

    return {
      ...data,
      payments: {
        ...(data.payments || {}),
        [name]: [...existing, { id: paymentId, amount: toZloty(toGrosze(amount)), date: todayISO() }],
      },
    } as RawAppData;
  }, 'Nie udało się dodać wpłaty');

  return result.success ? { ...result, paymentId } : result;
}

export async function removePayment(
  playerName: string,
  paymentId: string,
): Promise<TransactionResult> {
  const name = normalizePlayerName(playerName);
  if (!name) return { success: false, error: 'Nie wybrano gracza' };

  let paymentFound = true;

  const result = await withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const existing: Payment[] = data.payments?.[name] ?? [];

    if (!existing.some(p => p.id === paymentId)) {
      paymentFound = false;
      return data;
    }

    return {
      ...data,
      payments: {
        ...(data.payments || {}),
        [name]: existing.filter(p => p.id !== paymentId),
      },
    } as RawAppData;
  }, 'Nie udało się cofnąć wpłaty');

  if (result.success && !paymentFound) {
    return { success: false, error: 'Nie znaleziono wpłaty do cofnięcia' };
  }
  return result;
}
