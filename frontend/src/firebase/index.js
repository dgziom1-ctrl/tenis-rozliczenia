// Backward-compat shim — will be removed after full migration to @/lib/firebase
export {
  subscribeToData,
  database,
  addSession, updateWeek, deleteWeek,
  addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, saveDefaultMulti,
  settlePlayer, undoSettle, addPayment, removePayment,
} from '../lib/firebase/index';
