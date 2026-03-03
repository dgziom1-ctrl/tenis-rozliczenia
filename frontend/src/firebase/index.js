// Public API – importuj stąd zamiast z firebase.js
export { subscribeToData } from './subscriptions';
export { database } from './config';

// Weeks
export { addSession, updateWeek, deleteWeek } from './weeks';

// Players
export { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, saveDefaultMulti } from './players';

// Payments
export { settlePlayer, undoSettle } from './payments';
