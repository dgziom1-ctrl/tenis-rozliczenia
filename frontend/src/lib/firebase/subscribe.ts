import { onValue } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { buildUIData, normalizeRawData } from './transforms';
import type { UIData } from '@/types/ui';

export function subscribeToData(
  callback: (data: UIData) => void,
  onError?: (error: Error) => void,
): () => void {
  return onValue(
    dataRef,
    (snapshot) => {
      try {
        const normalized = normalizeRawData(snapshot.val() || {});
        setCurrentData(normalized);
        callback(buildUIData(normalized));
      } catch (error) {
        console.error('Data processing error:', error);
        if (typeof onError === 'function') onError(error as Error);
      }
    },
    (error) => {
      if (typeof onError === 'function') onError(error);
    },
  );
}
