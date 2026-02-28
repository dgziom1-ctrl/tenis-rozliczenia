import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { calculateDebt, roundToTwoDecimals } from './utils/calculations';
import { ORGANIZER_NAME } from './constants';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dataRef = ref(database, 'appData');

let _currentData = null;

function calculatePlayerStats(playerName, weeks, playerJoinWeek, paidUntilWeek) {
  const joinedAt = playerJoinWeek?.[playerName] ?? 0;
  const playerWeeks = weeks.slice(joinedAt);
  const attendanceCount = playerWeeks.filter(w => 
    (w.present || []).includes(playerName)
  ).length;
  const currentDebt = calculateDebt(playerName, { weeks, paidUntilWeek });

  return {
    name: playerName,
    attendanceCount,
    currentDebt,
  };
}

function buildSummary(playerStats) {
  const nonOrgPlayers = playerStats.filter(p => p.name !== ORGANIZER_NAME);
  const totalToCollect = nonOrgPlayers.reduce((sum, p) => sum + p.currentDebt, 0);
  const settledCount = nonOrgPlayers.filter(p => p.currentDebt <= 0.01).length;

  return {
    totalToCollect: roundToTwoDecimals(totalToCollect),
    settledPlayers: settledCount,
    totalPlayers: nonOrgPlayers.length,
  };
}

function transformWeeksToHistory(weeks) {
  return [...weeks].reverse().map(w => {
    const payers = (w.present || []).filter(p => !(w.multiPlayers || []).includes(p));
    const costPerPerson = payers.length > 0 ? w.cost / payers.length : 0;

    return {
      id: w.id,
      datePlayed: w.date,
      totalCost: w.cost,
      costPerPerson: roundToTwoDecimals(costPerPerson),
      presentPlayers: w.present || [],
      multisportPlayers: w.multiPlayers || [],
    };
  });
}

function buildUIData(rawData) {
  const {
    players = [],
    weeks = [],
    playerJoinWeek = {},
    paidUntilWeek = {},
    defaultMultiPlayers = [],
    deletedPlayers = [],
  } = rawData;

  const playerStats = players
    .map(name => calculatePlayerStats(name, weeks, playerJoinWeek, paidUntilWeek))
    .sort((a, b) => b.currentDebt - a.currentDebt || a.name.localeCompare(b.name, 'pl'));

  const summary = buildSummary(playerStats);
  summary.totalWeeks = weeks.length;

  const history = transformWeeksToHistory(weeks);

  return {
    summary,
    players: playerStats,
    playerNames: players,
    defaultMultiPlayers,
    deletedPlayers,
    history,
  };
}

export function subscribeToData(callback) {
  return onValue(dataRef, (snapshot) => {
    const rawData = snapshot.val() || {};
    _currentData = {
      players: rawData.players || [],
      weeks: rawData.weeks || [],
      paidUntilWeek: rawData.paidUntilWeek || {},
      defaultMultiPlayers: rawData.defaultMultiPlayers || [],
      playerJoinWeek: rawData.playerJoinWeek || {},
      deletedPlayers: rawData.deletedPlayers || [],
    };
    callback(buildUIData(_currentData));
  });
}

function save() {
  return set(dataRef, _currentData);
}

export async function addSession({ datePlayed, totalCost, presentPlayers, multisportPlayers }) {
  if (!_currentData) return;
  _currentData.weeks = [
    ...(_currentData.weeks || []),
    {
      id: Date.now().toString(36),
      date: datePlayed,
      cost: totalCost,
      present: presentPlayers,
      multiPlayers: multisportPlayers,
    },
  ];
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
  _currentData.players = (_currentData.players || []).filter(p => p !== playerName);
  _currentData.deletedPlayers = [...(_currentData.deletedPlayers || []), playerName];
  await save();
}

export async function restorePlayer(playerName) {
  if (!_currentData) return;
  _currentData.deletedPlayers = (_currentData.deletedPlayers || []).filter(p => p !== playerName);
  _currentData.players = [...(_currentData.players || []), playerName];
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
