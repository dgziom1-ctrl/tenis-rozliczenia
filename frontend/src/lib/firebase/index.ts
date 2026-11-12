import { track } from '@/lib/analytics/track';
import { addSession as addSessionRaw, updateWeek as updateWeekRaw, deleteWeekWithSnapshot as deleteWeekRaw, restoreWeek as restoreWeekRaw } from './mutations/sessions';
import {
  addPlayer as addPlayerRaw, softDeletePlayer as softDeletePlayerRaw, restorePlayer as restorePlayerRaw,
  permanentDeletePlayer as permanentDeletePlayerRaw, saveDefaultMulti as saveDefaultMultiRaw,
} from './mutations/players';
import { addPayment as addPaymentRaw, removePayment as removePaymentRaw } from './mutations/payments';

export { subscribeToData } from './subscribe';
export { database } from './config';
export { loadSnapshot, clearSnapshot } from './snapshotCache';
export { buildUIData } from './transforms';

/**
 * Opakowuje mutację tak, by zostawiła ślad w statystykach: jedno zdarzenie
 * z wynikiem (udane / nieudane + krótki powód), bez żadnych kwot ani imion.
 * Wynik mutacji przechodzi dalej nietknięty.
 */
function instrument<A extends unknown[], R extends { success: boolean; error?: string; indeterminate?: boolean }>(
  event: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const result = await fn(...args);
    track(event, {
      ok: result.success,
      err: result.success ? undefined : result.error?.slice(0, 60),
      unknown: result.indeterminate || undefined,
    });
    return result;
  };
}

export const addSession = instrument('session_added', addSessionRaw);
export const updateWeek = instrument('session_edited', updateWeekRaw);
export const deleteWeekWithSnapshot = instrument('session_deleted', deleteWeekRaw);
export const restoreWeek = instrument('session_restored', restoreWeekRaw);

export const addPlayer = instrument('player_added', addPlayerRaw);
export const softDeletePlayer = instrument('player_removed', softDeletePlayerRaw);
export const restorePlayer = instrument('player_restored', restorePlayerRaw);
export const permanentDeletePlayer = instrument('player_purged', permanentDeletePlayerRaw);
export const saveDefaultMulti = instrument('multisport_defaults_saved', saveDefaultMultiRaw);

export const addPayment = instrument('payment_added', addPaymentRaw);
export const removePayment = instrument('payment_undone', removePaymentRaw);
