import { onValue } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { buildUIData, normalizeRawData } from './transforms';

export function subscribeToData(callback, onError) {
  return onValue(
    dataRef,
    (snapshot) => {
      try {
        const normalized = normalizeRawData(snapshot.val() || {});
        setCurrentData(normalized);
        callback(buildUIData(normalized));
      } catch (error) {
        console.error('Data processing error:', error);
        if (typeof onError === 'function') onError(error);
      }
    },
    (error) => {
      if (typeof onError === 'function') onError(error);
    },
  );
}
