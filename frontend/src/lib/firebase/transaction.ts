import { runTransaction } from 'firebase/database';
import { dataRef } from './config';
import type { RawAppData, TransactionResult } from '@/types/domain';

const WRITE_TIMEOUT_MS = 12_000;

/**
 * Odrzucenie zapisu przez regułę biznesową (np. „Sesja z tą datą już istnieje”).
 * To spodziewany przebieg, a nie awaria — dlatego nie trafia do konsoli.
 */
class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MutationError';
  }
}

/** Przerywa transakcję z komunikatem przeznaczonym dla użytkownika. */
export function reject(message: string): never {
  throw new MutationError(message);
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export async function withTransaction(
  fn: (current: RawAppData | null) => RawAppData,
  fallbackErrorMsg: string,
): Promise<TransactionResult> {
  try {
    await Promise.race([
      runTransaction(dataRef, fn),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('__WRITE_TIMEOUT__')), WRITE_TIMEOUT_MS),
      ),
    ]);
    return { success: true };
  } catch (error) {
    if (error instanceof MutationError) {
      return { success: false, error: error.message };
    }
    console.error(error);

    // Brak sieci — najczęstsza przyczyna, gdy zapis wisi. Transakcja nie
    // dotarła do serwera, więc ponowienie jest bezpieczne.
    if (isOffline()) {
      return {
        success: false,
        error: 'Brak połączenia z internetem — zmiana nie została zapisana. Spróbuj ponownie, gdy wróci sieć.',
      };
    }

    // Przekroczony limit czasu NIE oznacza, że zapis się nie udał — przestajemy
    // tylko na niego czekać. Transakcja mogła zostać zatwierdzona na serwerze,
    // dlatego oznaczamy wynik jako niepewny i nie zachęcamy do ponowienia
    // (ponowione dopisanie wpłaty policzyłoby ją drugi raz).
    if (error instanceof Error && error.message === '__WRITE_TIMEOUT__') {
      return {
        success: false,
        indeterminate: true,
        error: 'Zapis trwa zbyt długo i nie znamy jego wyniku. Odśwież i sprawdź, czy zmiana się zapisała, zanim spróbujesz ponownie.',
      };
    }

    // Błędy walidacji rzucone wewnątrz transakcji (np. „Sesja z tą datą już istnieje”).
    return {
      success: false,
      error: error instanceof Error ? error.message : fallbackErrorMsg,
    };
  }
}
