import { makeId, todayISO } from '@/utils/id';
import { toGrosze, toZloty } from '@/utils/money';
import { isPositiveMoney, normalizePlayerName } from '@/utils/validation';
import { withTransaction, reject } from '../transaction';
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

  // Kwota i data są ustalane PRZED transakcją. Firebase może uruchomić callback
  // wielokrotnie, a wtedy wpłata zapisana tuż po północy dostałaby inną datę
  // przy kolejnej próbie.
  const entry: Payment = {
    id: paymentId,
    amount: toZloty(toGrosze(amount)),
    date: todayISO(),
  };

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
        [name]: [...existing, entry],
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

  // „Nie znaleziono" zgłaszamy przerwaniem transakcji, a nie flagą na zewnątrz.
  // Flaga ustawiona w próbie, która się nie zatwierdziła, przeżywała ponowienie
  // i potrafiła zgłosić błąd po zapisie, który faktycznie doszedł do skutku.
  return withTransaction((current) => {
    const data = (current || {}) as RawAppData;
    const existing: Payment[] = data.payments?.[name] ?? [];

    if (!existing.some(p => p.id === paymentId)) {
      reject('Nie znaleziono wpłaty do cofnięcia');
    }

    return {
      ...data,
      payments: {
        ...(data.payments || {}),
        [name]: existing.filter(p => p.id !== paymentId),
      },
    } as RawAppData;
  }, 'Nie udało się cofnąć wpłaty');
}
