import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app      = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dataRef  = ref(database, 'appData');

let _currentData = null;

export function subscribeToData(callback) {
  return onValue(dataRef, (snapshot) => {
    const raw = snapshot.val() || {};
    _currentData = {
      players:             raw.players             || [],
      organizerName:       raw.organizerName       || 'Kamil',
      weeks:               raw.weeks               || [],
      paidUntilWeek:       raw.paidUntilWeek       || {},
      defaultMultiPlayers: raw.defaultMultiPlayers || [],
      playerJoinWeek:      raw.playerJoinWeek      || {},
      deletedPlayers:      raw.deletedPlayers      || [],
    };
    callback(buildUIData(_currentData));
  });
}

function save() {
  return set(dataRef, _currentData);
}

function buildUIData(d) {
  const playerNames = d.players || [];
  const weeks       = d.weeks   || [];
  const organizer   = d.organizerName || 'Kamil';

  const playerStats = playerNames.map(name => {
    const joinedAt   = d.playerJoinWeek?.[name] ?? 0;
    const myWeeks    = weeks.slice(joinedAt);
    const attendance = myWeeks.filter(w => (w.present || []).includes(name)).length;
    const debt       = calcDebt(name, d);
    return { name, attendance_count: attendance, current_debt: debt };
  });

  playerStats.sort((a, b) =>
    b.current_debt - a.current_debt || a.name.localeCompare(b.name, 'pl')
  );

  const nonOrg         = playerStats.filter(p => p.name !== organizer);
  const totalToCollect = nonOrg.reduce((s, p) => s + p.current_debt, 0);
  const settledCount   = nonOrg.filter(p => p.current_debt <= 0.01).length;

  const history = [...weeks].reverse().map(w => {
    const payers        = (w.present || []).filter(p => !(w.multiPlayers || []).includes(p));
    const costPerPerson = payers.length > 0 ? w.cost / payers.length : 0;
    return {
      id:                 w.id,
      date_played:        w.date,
      total_cost:         w.cost,
      cost_per_person:    costPerPerson,
      present_players:    w.present      || [],
      multisport_players: w.multiPlayers || [],
    };
  });

  return {
    summary: {
      total_to_collect: Math.round(totalToCollect * 100) / 100,
      total_weeks:      weeks.length,
      settled_players:  settledCount,
      total_players:    nonOrg.length,
    },
    players:             playerStats,
    playerNames:         playerNames,
    defaultMultiPlayers: d.defaultMultiPlayers || [],
    deletedPlayers:      d.deletedPlayers      || [],
    history,
  };
}

function calcDebt(playerName, d) {
  if (playerName === d.organizerName) return 0;
  const paidWeekId = d.paidUntilWeek?.[playerName];
  const paidIdx    = paidWeekId
    ? (d.weeks || []).findIndex(w => w.id === paidWeekId)
    : -1;

  let debt = 0;
  (d.weeks || []).forEach((week, idx) => {
    if (idx <= paidIdx)                                 return;
    if (!(week.present || []).includes(playerName))     return;
    if ((week.multiPlayers || []).includes(playerName)) return;
    const payers = (week.present || []).filter(p => !(week.multiPlayers || []).includes(p)).length;
    if (payers > 0) debt += week.cost / payers;
  });
  return Math.round(debt * 100) / 100;
}

export async function addSession({ date_played, total_cost, present_players, multisport_players }) {
  if (!_currentData) return;
  _currentData.weeks = [...(_currentData.weeks || []), {
    id:           Date.now().toString(36),
    date:         date_played,
    cost:         total_cost,
    present:      present_players,
    multiPlayers: multisport_players,
  }];
  await save();
}

export async function updateWeek(weekId, { date, cost, present, multiPlayers }) {
  if (!_currentData) return;
  const idx = (_currentData.weeks || []).findIndex(w => w.id === weekId);
  if (idx === -1) return;
  _currentData.weeks[idx] = { id: weekId, date, cost, present, multiPlayers };
  await save();
}

export async function deleteWeek(weekId) {
  if (!_currentData) return;
  _currentData.weeks = (_currentData.weeks || []).filter(w => w.id !== weekId);
  await save();
}

export async function settlePlayer(playerName) {
  if (!_currentData) return null;
  const weeks = _currentData.weeks || [];
  if (weeks.length === 0) return null;
  const previousValue = _currentData.paidUntilWeek?.[playerName] ?? null;
  _currentData.paidUntilWeek = {
    ...(_currentData.paidUntilWeek || {}),
    [playerName]: weeks[weeks.length - 1].id,
  };
  await save();
  return previousValue;
}

export async function undoSettle(playerName, previousValue) {
  if (!_currentData) return;
  const paid = { ...(_currentData.paidUntilWeek || {}) };
  if (previousValue === null) {
    delete paid[playerName];
  } else {
    paid[playerName] = previousValue;
  }
  _currentData.paidUntilWeek = paid;
  await save();
}

export async function addPlayer(name) {
  if (!_currentData) return;
  if ((_currentData.players || []).includes(name)) return;
  _currentData.players = [...(_currentData.players || []), name];
  _currentData.playerJoinWeek = {
    ...(_currentData.playerJoinWeek || {}),
    [name]: (_currentData.weeks || []).length,
  };
  await save();
}

export async function softDeletePlayer(playerName) {
  if (!_currentData) return;
  _currentData.players        = (_currentData.players || []).filter(p => p !== playerName);
  _currentData.deletedPlayers = [...(_currentData.deletedPlayers || []), playerName];
  await save();
}

export async function restorePlayer(playerName) {
  if (!_currentData) return;
  _currentData.deletedPlayers = (_currentData.deletedPlayers || []).filter(p => p !== playerName);
  _currentData.players        = [...(_currentData.players || []), playerName];
  await save();
}

export async function permanentDeletePlayer(playerName) {
  if (!_currentData) return;
  _currentData.deletedPlayers = (_currentData.deletedPlayers || []).filter(p => p !== playerName);
  await save();
}

export async function saveDefaultMulti(playerNames) {
  if (!_currentData) return;
  _currentData.defaultMultiPlayers = playerNames;
  await save();
}

export { database };
