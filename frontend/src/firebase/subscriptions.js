import { onValue } from 'firebase/database';
import { dataRef } from './config';
import { setCurrentData } from './state';
import { buildUIData, normalizeRawData } from './transforms';

export function subscribeToData(callback) {
  return onValue(dataRef, (snapshot) => {
    const normalized = normalizeRawData(snapshot.val() || {});
    setCurrentData(normalized);
    callback(buildUIData(normalized));
  });
}
