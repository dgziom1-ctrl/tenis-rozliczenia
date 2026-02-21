// ═══════════════════════════════════════════════════
//  FIREBASE SERVICE — zastępuje cały backend Pythona
//  Wszystkie operacje na danych są tutaj.
// ═══════════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';

const firebaseConfig = {
  apiKey:            "AIzaSyA0aSm_EoDVibcu46IRL3xaFSskApWYrMo",
  authDomain:        "tenis-rozliczenia.firebaseapp.com",
  databaseURL:       "https://tenis-rozliczenia-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "tenis-rozliczenia",
  storageBucket:     "tenis-rozliczenia.firebasestorage.app",
  messagingSenderId: "897063845076",
  appId:             "1:897063845076:web:76aa13cf2ef1759a654f41"
};

const app      = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dataRef  = ref(database, 'appData');

// ─── Wewnętrzna pamięć podręczna aktualnych danych ────
let _currentData = null;

// ─── Subskrypcja real-time ─────────────────────────────
// Wywołaj raz w App.jsx, podaj callback który dostanie
// przetworzone dane w formacie jakiego oczekują komponenty Krzysztofa.
export function subscribeToData(callback) {
  return onValue(dataRef, (snapshot) => {
    const raw = snapshot.val() || {};

    // Upewniamy się że wszystkie pola istnieją
    _currentData = {
      players:             raw.players             || [],
      organizerName:       raw.organizerName       || 'Kamil',
      weeks:               raw.weeks               || [],
      paidUntilWeek:       raw.paidUntilWeek       || {},
      defaultMultiPlayers: raw.defaultMultiPlayers || [],
      playerJoinWeek:      raw.playerJoinWeek      || {},
    };

    callback(transformData(_currentData));
  });
}

// ─── Zapisz cały stan do Firebase ─────────────────────
function save() {
  return set(dataRef, _currentData);
}

// ═══════════════════════════════════════════════════
//  TRANSFORMACJA DANYCH
//  Nasze Firebase → format komponentów Krzysztofa
// ═══════════════════════════════════════════════════

function transformData(d) {
  const players    = d.players || [];
  const weeks      = d.weeks   || [];
  const organizer  = d.organizerName || 'Kamil';

  // Przelicz dług każdego gracza
  const playerStats = players.map(name => {
    const joinedAt      = d.playerJoinWeek?.[name] ?? 0;
    const relevantWeeks = weeks.slice(joinedAt);
    const attendance    = relevantWeeks.filter(w => w.present?.includes(name)).length;
    const debt          = calcDebt(name, d);
    return { name, attendance_count: attendance, current_debt: debt };
  });

  // Sortuj: dług malejąco, potem alfabetycznie
  playerStats.sort((a, b) =>
    b.current_debt - a.current_debt || a.name.localeCompare(b.name, 'pl')
  );

  const nonOrganizers  = playerStats.filter(p => p.name !== organizer);
  const totalToCollect = nonOrganizers.reduce((s, p) => s + p.current_debt, 0);
  const settledCount   = nonOrganizers.filter(p => p.current_debt <= 0.01).length;

  // Historia w formacie jakiego oczekuje HistoryTab
  const history = [...weeks].reverse().map(w => {
    const normalPlayers = (w.present || []).filter(p => !w.multiPlayers?.includes(p));
    const costPerPerson = normalPlayers.length > 0 ? w.cost / normalPlayers.length : 0;
    return {
      id:                w.id,
      date_played:       w.date,
      total_cost:        w.cost,
      cost_per_person:   costPerPerson,
      present_players:   w.present     || [],
      multisport_players: w.multiPlayers || [],
    };
  });

  return {
    summary: {
      total_to_collect: Math.round(totalToCollect * 100) / 100,
      total_weeks:      weeks.length,
      settled_players:  settledCount,
      total_players:    nonOrganizers.length,
    },
    players: playerStats,
    history,
  };
}

// ─── Oblicz dług gracza ────────────────────────────────
function calcDebt(playerName, d) {
  if (playerName === d.organizerName) return 0;
  const paidWeekId = d.paidUntilWeek?.[playerName];
  const paidIdx    = paidWeekId
    ? d.weeks.findIndex(w => w.id === paidWeekId)
    : -1;

  let debt = 0;
  (d.weeks || []).forEach((week, idx) => {
    if (idx <= paidIdx)                          return;
    if (!week.present?.includes(playerName))     return;
    if (week.multiPlayers?.includes(playerName)) return;
    const payers = (week.present || []).filter(p => !week.multiPlayers?.includes(p)).length;
    if (payers > 0) debt += week.cost / payers;
  });
  return Math.round(debt * 100) / 100;
}

// ═══════════════════════════════════════════════════
//  OPERACJE ZAPISU
//  Każda funkcja modyfikuje _currentData i zapisuje do Firebase
// ═══════════════════════════════════════════════════

// POST /api/sessions — dodaj nowy tydzień
export async function addSession({ date_played, total_cost, present_players, multisport_players }) {
  if (!_currentData) return;
  const week = {
    id:           Date.now().toString(36),
    date:         date_played,
    cost:         total_cost,
    present:      present_players,
    multiPlayers: multisport_players,
  };
  _currentData.weeks = [...(_currentData.weeks || []), week];
  await save();
}

// POST /api/players/{name}/settle — oznacz jako opłaconego
export async function settlePlayer(playerName) {
  if (!_currentData) return;
  const weeks = _currentData.weeks || [];
  if (weeks.length === 0) return;
  _currentData.paidUntilWeek = {
    ...(_currentData.paidUntilWeek || {}),
    [playerName]: weeks[weeks.length - 1].id,
  };
  await save();
}

// POST /api/players — dodaj gracza
export async function addPlayer(name) {
  if (!_currentData) return;
  if (_currentData.players.includes(name)) return;
  _currentData.players = [..._currentData.players, name];
  _currentData.playerJoinWeek = {
    ...(_currentData.playerJoinWeek || {}),
    [name]: (_currentData.weeks || []).length,
  };
  await save();
}

// DELETE /api/players/{name} — usuń gracza
export async function deletePlayer(playerName) {
  if (!_currentData) return;
  _currentData.players = _currentData.players.filter(p => p !== playerName);
  await save();
}

// ─── Status połączenia ─────────────────────────────────
export { database };
