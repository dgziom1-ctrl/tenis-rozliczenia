import { onValue } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { buildUIData, normalizeRawData } from './transforms';
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
        const normalized = normalizeRawData(snapshot.val() || {});
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
