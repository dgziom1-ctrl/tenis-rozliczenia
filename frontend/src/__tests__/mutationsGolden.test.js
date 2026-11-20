// Złote wyniki mutacji bazy: dla stałego stanu wyjściowego zapisujemy, jak wygląda
// CAŁY węzeł `appData` po każdej operacji (i co zwróciła). Chroni refaktor warstwy
// danych — typów `current`, wspólnych helperów transakcji — przed cichą zmianą
// tego, co trafia do bazy: pól legacy, kolejności sesji, idempotencji, komunikatów.
//
// Złoty plik odtwarza się CELOWO, gdy zmienia się kontrakt zapisu (nie przy refaktorze):
//   UPDATE_GOLDEN=1 npx vitest run src/__tests__/mutationsGolden.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { runTransactionImpl, stateModule, idCounter } = vi.hoisted(() => {
  let data = null;
  const stateModule = {
    setCurrentData: (next) => { data = next; },
    getCurrentData: () => data,
  };
  // Fałszywa baza: callback dostaje kopię bieżącego stanu, wynik `undefined`
  // oznacza przerwanie transakcji (tak jak w prawdziwym SDK).
  const runTransactionImpl = vi.fn(async (_ref, updateFn) => {
    const current = data ? JSON.parse(JSON.stringify(data)) : null;
    const result = updateFn(current);
    if (result !== undefined) data = JSON.parse(JSON.stringify(result));
  });
  return { runTransactionImpl, stateModule, idCounter: { value: 0 } };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
  runTransaction: runTransactionImpl,
}));
vi.mock('../lib/firebase/config', () => ({ database: {}, dataRef: {} }));
// Deterministyczne identyfikatory i „dzisiejsza" data — wynik nie zależy od zegara.
vi.mock('../utils/id', () => ({
  makeId: () => `id-${++idCounter.value}`,
  todayISO: () => '2025-06-15',
}));

const sessions = await import('../lib/firebase/mutations/sessions');
const players = await import('../lib/firebase/mutations/players');
const payments = await import('../lib/firebase/mutations/payments');

const GOLDEN_PATH = path.resolve(process.cwd(), 'src/__tests__/fixtures/mutations.golden.json');

/** Stan wyjściowy z rekordami legacy, nową zasadą zniżek i śmieciowym `paidUntilWeek`. */
const BASE = {
  players: ['Kamil', 'Ola', 'Bartek', 'Zosia', 'Nowy'],
  deletedPlayers: ['Stary'],
  defaultMultiPlayers: ['Ola', 'Zosia'],
  singleScanPlayers: ['Zosia'],
  playerJoinDate: { Kamil: '2025-01-01', Ola: '2025-01-01', Bartek: '2025-02-10', Zosia: '2025-03-01', Nowy: '2025-06-01' },
  playerJoinWeek: { Stary: 1, Ola: 0 },
  paidUntilWeek: { Ola: 2 },
  weeks: [
    {
      id: 'w-legacy', date: '2025-01-08', cost: 45, sport: 'pingpong',
      present: ['Kamil', 'Ola', 'Bartek'], multiPlayers: ['Ola'],
      overtimeCost: 15, overtimePlayers: ['Ola'],
    },
    {
      id: 'w-mid', date: '2025-02-05', cost: 60, sport: 'badminton',
      present: ['Kamil', 'Ola', 'Bartek'], multiPlayers: ['Ola'], courtCount: 2, durationHours: 1,
    },
    {
      id: 'w-scan', date: '2025-03-12', cost: 97.33, sport: 'squash',
      present: ['Kamil', 'Ola', 'Zosia', 'Bartek'], multiPlayers: ['Ola', 'Zosia'], singleScanPlayers: ['Zosia'],
      racketCost: 10, ownRacketPlayers: ['Kamil'], courtCount: 1, durationHours: 2,
      discountModel: 'perScan', courtGross: 120,
    },
  ],
  payments: {
    Ola: [{ id: 'p1', amount: 20, date: '2025-02-01' }],
    Bartek: [{ id: 'p2', amount: 5.5, date: '2025-03-01' }],
  },
  lastAddedSession: { id: 'w-scan', ts: 1741000000000 },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Wspólne pola formularza edycji tak, jak buduje je `HistoryTab`. */
const edit = (overrides) => ({
  date: '2025-03-12', cost: 97.33, present: ['Kamil', 'Ola', 'Zosia', 'Bartek'],
  multiPlayers: ['Ola', 'Zosia'], sport: 'squash', ...overrides,
});

/** Wykonuje kroki jeden po drugim (każda mutacja widzi stan po poprzedniej) i zbiera wyniki. */
const steps = (...thunks) => async () => {
  const outcomes = [];
  for (const thunk of thunks) outcomes.push(await thunk());
  return outcomes;
};

const SCENARIOS = {
  'addSession: ping-pong z domyślnymi korty i godzinami': steps(
    () => sessions.addSession({ datePlayed: '2025-04-02', totalCost: 40, presentPlayers: ['Kamil', 'Ola'] }),
  ),
  'addSession: squash z rakietami, Medicoverem, courtGross i 2 kortami na 2 h': steps(
    () => sessions.addSession({
      datePlayed: '2025-04-03', totalCost: 110.5, presentPlayers: ['Kamil', 'Ola', 'Zosia', 'Bartek'],
      multisportPlayers: ['Ola', 'Zosia', 'Ghost'], sport: 'squash', racketCost: 12.5,
      ownRacketPlayers: ['Kamil', 'Ghost'], courtCount: 2, durationHours: 2,
      singleScanPlayers: ['Zosia', 'Bartek'], courtGross: 150,
    }),
  ),
  'addSession: odrzucenia (duplikat, brak graczy, rakiety > koszt, zwrot > cena, data, sport)': steps(
    () => sessions.addSession({ datePlayed: '2025-03-12', totalCost: 50, presentPlayers: ['Kamil'], sport: 'squash' }),
    () => sessions.addSession({ datePlayed: '2025-04-04', totalCost: 50, presentPlayers: [] }),
    () => sessions.addSession({ datePlayed: '2025-04-04', totalCost: 50, presentPlayers: ['Kamil'], racketCost: 60 }),
    () => sessions.addSession({ datePlayed: '2025-04-04', totalCost: 50, presentPlayers: ['Kamil'], courtGross: 40 }),
    () => sessions.addSession({ datePlayed: '2025-02-31', totalCost: 50, presentPlayers: ['Kamil'] }),
    () => sessions.addSession({ datePlayed: '2025-04-04', totalCost: 50, presentPlayers: ['Kamil'], sport: 'curling' }),
  ),
  'addSession: ta sama data, inny sport jest dozwolona': steps(
    () => sessions.addSession({ datePlayed: '2025-03-12', totalCost: 30, presentPlayers: ['Kamil'], sport: 'pingpong' }),
  ),
  'updateWeek: stara sesja z dogrywką scala dogrywkę z kosztem i zachowuje brak konfiguracji': steps(
    () => sessions.updateWeek('w-legacy', {
      date: '2025-01-08', cost: 60, present: ['Kamil', 'Ola', 'Bartek'], multiPlayers: ['Ola'], sport: 'pingpong',
    }),
  ),
  'updateWeek: sesja perScan — nowa cena, skład, Medicover i rakiety': steps(
    () => sessions.updateWeek('w-scan', edit({
      cost: 100, present: ['Kamil', 'Ola', 'Zosia'], multiPlayers: ['Ola'], singleScanPlayers: ['Zosia'],
      racketCost: 8, ownRacketPlayers: ['Ola'], courtCount: 2, durationHours: 1, courtGross: 125,
    })),
  ),
  'updateWeek: sesja bez discountModel nie dostaje courtGross ani zasady': steps(
    () => sessions.updateWeek('w-mid', {
      date: '2025-02-05', cost: 60, present: ['Kamil', 'Ola'], multiPlayers: ['Ola'], sport: 'badminton',
      courtCount: 2, durationHours: 1, courtGross: 80,
    }),
  ),
  'updateWeek: zmiana sportu, daty i odrzucenia (duplikat, brak sesji, błędny koszt)': steps(
    () => sessions.updateWeek('w-mid', { date: '2025-02-06', cost: 60, present: ['Kamil'], multiPlayers: [], sport: 'padel' }),
    () => sessions.updateWeek('w-mid', { date: '2025-03-12', cost: 60, present: ['Kamil'], multiPlayers: [], sport: 'squash' }),
    () => sessions.updateWeek('nie-ma', { date: '2025-02-06', cost: 60, present: ['Kamil'], multiPlayers: [] }),
    () => sessions.updateWeek('w-mid', { date: '2025-02-06', cost: -1, present: ['Kamil'], multiPlayers: [] }),
    () => sessions.updateWeek('', { date: '2025-02-06', cost: 60, present: ['Kamil'], multiPlayers: [] }),
  ),
  'deleteWeekWithSnapshot + restoreWeek: rekord legacy wraca z polami legacy': async () => {
    const removed = await sessions.deleteWeekWithSnapshot('w-legacy');
    const restored = await sessions.restoreWeek(removed.deletedWeek);
    const again = await sessions.restoreWeek(removed.deletedWeek);
    return [removed, restored, again];
  },
  'deleteWeekWithSnapshot: odrzucenie dla nieznanego id': steps(
    () => sessions.deleteWeekWithSnapshot('nie-ma'),
    () => sessions.deleteWeekWithSnapshot(''),
  ),
  'restoreWeek: kolizja daty i sportu oraz niepoprawny rekord': steps(
    () => sessions.restoreWeek({ id: 'w-inny', date: '2025-03-12', cost: 20, sport: 'squash', present: ['Kamil'], multiPlayers: [] }),
    () => sessions.restoreWeek({ id: '', date: '2025-03-12', cost: 20, present: ['Kamil'], multiPlayers: [] }),
    () => sessions.restoreWeek({ id: 'w-x', date: '2025-05-01', cost: 20, sport: 'padel', present: [], multiPlayers: [] }),
  ),
  'addPlayer: nowy gracz dostaje datę dołączenia': steps(
    () => players.addPlayer('  Marta  '),
  ),
  'addPlayer: odrzucenia (duplikat, lista usuniętych, historia, znaki, pusta nazwa)': steps(
    () => players.addPlayer('Kamil'),
    () => players.addPlayer('Stary'),
    () => players.addPlayer('Zosia '),
    () => players.addPlayer('Kuba K.'),
    () => players.addPlayer('   '),
  ),
  'softDeletePlayer: bez salda trafia na listę usuniętych, z saldem jest odrzucony': steps(
    () => players.softDeletePlayer('Nowy'),
    () => players.softDeletePlayer('Bartek'),
    () => players.softDeletePlayer('Nie ma'),
  ),
  'restorePlayer: wraca na listę i nie dubluje się': async () => {
    const first = await players.restorePlayer('Stary');
    const second = await players.restorePlayer('Stary');
    return [first, second];
  },
  'permanentDeletePlayer: bez sesji czyści wszystkie ślady, z sesjami jest odrzucony': steps(
    () => players.permanentDeletePlayer('Nowy'),
    () => players.permanentDeletePlayer('Ola'),
  ),
  'setPlayerCard: none / multi / single zmienia obie listy naraz': async () => {
    const results = [];
    for (const [name, card] of [['Bartek', 'single'], ['Ola', 'none'], ['Kamil', 'multi'], ['Zosia', 'multi'], ['Nowy', 'wat'], ['Duch', 'multi']]) {
      results.push(await players.setPlayerCard(name, card));
    }
    return results;
  },
  'addPayment: nowa wpłata, ponowienie tym samym id nie dubluje, kwota jest zaokrąglana': async () => [
    await payments.addPayment('Kamil', 12.345, 'pay-1'),
    await payments.addPayment('Kamil', 12.345, 'pay-1'),
    await payments.addPayment('Ola', 30),
  ],
  'addPayment: odrzucenia (zero, ujemna, brak gracza)': steps(
    () => payments.addPayment('Kamil', 0, 'pay-z'),
    () => payments.addPayment('Kamil', -5, 'pay-n'),
    () => payments.addPayment('  ', 10, 'pay-e'),
  ),
  'removePayment: usuwa wskazaną wpłatę, brakującą odrzuca': async () => [
    await payments.removePayment('Ola', 'p1'),
    await payments.removePayment('Ola', 'p1'),
    await payments.removePayment('Nie ma', 'p1'),
  ],
};

async function runScenario(name) {
  stateModule.setCurrentData(clone(BASE));
  idCounter.value = 0;
  const results = await SCENARIOS[name]();
  return { results: JSON.parse(JSON.stringify(results)), state: stateModule.getCurrentData() };
}

describe('mutacje bazy — złote wyniki', () => {
  let dateSpy;
  beforeEach(() => { dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1750000000000); });
  afterEach(() => { dateSpy.mockRestore(); });

  const update = process.env.UPDATE_GOLDEN === '1';
  const golden = update ? {} : JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
  const recorded = {};

  it.each(Object.keys(SCENARIOS))('%s', async (name) => {
    const actual = await runScenario(name);
    if (update) {
      recorded[name] = actual;
      fs.writeFileSync(GOLDEN_PATH, `${JSON.stringify(recorded, null, 2)}\n`);
      return;
    }
    expect(golden[name]).toBeDefined();
    expect(actual).toEqual(golden[name]);
  });

  it('żaden zapis nie zostawia w bazie pola paidUntilWeek', async () => {
    const actual = await runScenario('addPlayer: nowy gracz dostaje datę dołączenia');
    expect(actual.state).not.toHaveProperty('paidUntilWeek');
  });

  it('złoty plik nie zawiera przestarzałych scenariuszy', () => {
    if (update) return;
    expect(Object.keys(golden).sort()).toEqual(Object.keys(SCENARIOS).sort());
  });
});
