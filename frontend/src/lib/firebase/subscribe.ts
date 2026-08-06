import { onValue } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { buildUIData, normalizeRawData } from './transforms';
import type { NormalizedData } from '@/types/domain';
import type { UIData } from '@/types/ui';

export type SubscribeErrorKind = 'connection' | 'data';

export function subscribeToData(
  callback: (data: UIData) => void,
  onError?: (error: Error, kind: SubscribeErrorKind) => void,
): () => void {
  return onValue(
    dataRef,
    (snapshot) => {
      try {
        // `snapshot.val()` jest z natury nietypowane — cokolwiek leży w bazie.
        // `normalizeRawData` jest jedyną bramą, która nadaje temu kształt.
        const raw = (snapshot.val() ?? {}) as Partial<NormalizedData>;
        const normalized = normalizeRawData(raw);
        setCurrentData(normalized);
        callback(buildUIData(normalized));
      } catch (error) {
        // Błąd PRZETWARZANIA danych (nie utrata połączenia) — połączenie działa,
        // ale pojedynczy snapshot był wadliwy. Nie kasujemy całej aplikacji.
        console.error('Data processing error:', error);
        if (typeof onError === 'function') onError(error as Error, 'data');
      }
    },
    (error) => {
      // Błąd POŁĄCZENIA z Firebase.
      if (typeof onError === 'function') onError(error, 'connection');
    },
  );
}
