import { onValue } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { saveSnapshot } from './snapshotCache';
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
        const ui = buildUIData(normalized);

        setCurrentData(normalized);
        // Dopiero po `buildUIData`: zapamiętujemy wyłącznie stan, który dał się
        // przetworzyć bez błędu, więc uszkodzone dane nigdy nie trafiają do
        // pamięci podręcznej i nie zepsują następnego uruchomienia.
        saveSnapshot(normalized);
        callback(ui);
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
