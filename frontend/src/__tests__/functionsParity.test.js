// Cloud Functions liczą kwoty do powiadomień własną kopią logiki podziału
// (osobny pakiet CommonJS, nie może zaimportować modułów z `src/`). Ten test
// pilnuje, żeby obie implementacje nigdy się nie rozjechały — inaczej push
// pokazywałby inną stawkę niż karta gracza w aplikacji.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { getSessionShares } from '../utils/sessionCost';
import { allocateExact, allocateNonNegative, splitEqually, toGrosze } from '../utils/money';
import { MULTISPORT_DISCOUNT, SPORT, hasRacketRental } from '../constants';

const require = createRequire(import.meta.url);
const fns = require('../../../functions/sessionCost.js');

const SESSIONS = [
  {
    label: 'ping-pong, podział bez reszty',
    session: { sport: 'pingpong', cost: 90, present: ['A', 'B', 'C'], multiPlayers: [] },
  },
  {
    label: 'ping-pong, podział z resztą (100/3)',
    session: { sport: 'pingpong', cost: 100, present: ['A', 'B', 'C'], multiPlayers: [] },
  },
  {
    label: 'ping-pong, część graczy z kartą Multisport',
    session: { sport: 'pingpong', cost: 100, present: ['A', 'B', 'C'], multiPlayers: ['B'] },
  },
  {
    label: 'ping-pong, wszyscy z kartą — resztę dzielą po równo',
    session: { sport: 'pingpong', cost: 100, present: ['A', 'B'], multiPlayers: ['A', 'B'] },
  },
  {
    label: 'ping-pong, karty pokryły całą kwotę',
    session: { sport: 'pingpong', cost: 0, present: ['A', 'B'], multiPlayers: ['A', 'B'] },
  },
  {
    label: 'squash z kartami i rakietami',
    session: {
      sport: 'squash', cost: 170.96, present: ['A', 'B', 'C', 'D'],
      multiPlayers: ['A', 'C'], racketCost: 20, ownRacketPlayers: ['D'],
    },
  },
  {
    label: 'squash, zniżka większa niż udział',
    session: { sport: 'squash', cost: 20, present: ['A', 'B'], multiPlayers: ['A', 'B'] },
  },
  {
    label: 'badminton z kartą',
    session: { sport: 'badminton', cost: 88, present: ['A', 'B', 'C'], multiPlayers: ['B'] },
  },
  {
    label: 'padel z kartami i rakietami',
    session: {
      sport: 'padel', cost: 120.5, present: ['A', 'B', 'C', 'D'],
      multiPlayers: ['B', 'D'], racketCost: 15, ownRacketPlayers: ['A'],
    },
  },
  {
    label: 'stary rekord z dogrywką — kwota dolicza się do sesji',
    session: {
      sport: 'pingpong', cost: 45, present: ['A', 'B', 'C'],
      multiPlayers: ['B'], overtimePlayers: ['A', 'C'], overtimeCost: 15,
    },
  },
  {
    label: 'squash, koszt rakiet większy niż koszt sesji',
    session: { sport: 'squash', cost: 30, present: ['A', 'B'], multiPlayers: [], racketCost: 50 },
  },
  {
    label: 'sesja bez graczy',
    session: { sport: 'pingpong', cost: 50, present: [], multiPlayers: [] },
  },
  {
    label: 'kwota niepoprawna (NaN)',
    session: { sport: 'pingpong', cost: NaN, present: ['A', 'B'], multiPlayers: [] },
  },
  {
    label: 'zdublowane imię na liście obecnych',
    session: { sport: 'pingpong', cost: 100, present: ['A', 'A', 'B'], multiPlayers: [] },
  },
  {
    label: 'aliasy pól z warstwy UI (presentPlayers / totalCost)',
    session: {
      sport: 'squash', totalCost: 100, presentPlayers: ['A', 'B', 'C'],
      multisportPlayers: ['A'], racketCost: 10, ownRacketPlayers: ['B'],
    },
  },
  {
    label: 'kwota z groszem na granicy zaokrąglenia (1.005)',
    session: { sport: 'pingpong', cost: 1.005, present: ['A'], multiPlayers: [] },
  },
  {
    label: 'squash, wszyscy z kartą — zniżka nie może zjeść całej kwoty',
    session: { sport: 'squash', cost: 10, present: ['A', 'B', 'C'], multiPlayers: ['A', 'B', 'C'] },
  },
];

describe('Cloud Functions liczą koszty identycznie jak aplikacja', () => {
  it.each(SESSIONS)('$label', ({ session }) => {
    expect(fns.getSessionShares(session)).toEqual(getSessionShares(session));
  });

  it.each(SESSIONS)('$label — suma udziałów pokrywa całą kwotę sesji', ({ session }) => {
    const shares = fns.getSessionShares(session);
    const allocated = Object.values(shares.byPlayer)
      .reduce((sum, s) => sum + toGrosze(s.total), 0);
    const total = session.totalCost ?? session.cost ?? 0;
    const expected = toGrosze(Number.isFinite(total) ? total : 0)
      + toGrosze(session.overtimeCost ?? 0);

    expect(allocated + toGrosze(shares.unallocated)).toBe(expected);
  });
});

// Stałe i helpery są w Cloud Functions przepisane ręcznie. Gdyby ktoś zmienił
// je tylko po jednej stronie, kwoty w powiadomieniu rozjechałyby się z kartą
// gracza dopiero na produkcji — dlatego pilnujemy ich tutaj wprost.
describe('Cloud Functions używają tych samych stałych co aplikacja', () => {
  it('zniżka Multisport jest identyczna', () => {
    expect(fns.MULTISPORT_DISCOUNT).toBe(MULTISPORT_DISCOUNT);
  });

  it.each([SPORT.PINGPONG, SPORT.SQUASH, SPORT.BADMINTON, SPORT.PADEL, 'nieznany'])(
    'klasyfikacja sportu „%s" jest identyczna',
    (sport) => {
      expect(fns.hasRacketRental(sport)).toBe(hasRacketRental(sport));
    },
  );
});

describe('Cloud Functions dzielą kwoty tym samym algorytmem', () => {
  const ALLOCATIONS = [
    { targets: [], total: 0 },
    { targets: [0, 0, 0], total: 100 },
    { targets: [-5, -5], total: 100 },
    { targets: [1, 1, 1], total: 100 },
    { targets: [10, -3], total: 100 },
    { targets: [1, 2, 3], total: 0 },
    { targets: [1, 1], total: -50 },
  ];

  it.each(ALLOCATIONS)('allocateExact($targets, $total)', ({ targets, total }) => {
    expect(fns.allocateExact(targets, total)).toEqual(allocateExact(targets, total));
  });

  it.each(ALLOCATIONS)('allocateNonNegative($targets, $total)', ({ targets, total }) => {
    const actual = fns.allocateNonNegative(targets, total);
    expect(actual).toEqual(allocateNonNegative(targets, total));
    // Kluczowa własność: nic nie ginie i nic się nie pojawia.
    if (targets.length > 0) {
      expect(actual.reduce((sum, v) => sum + v, 0)).toBe(total);
    }
  });

  it.each([[100, 3], [100, 1], [0, 4], [7, 7], [5, 2]])(
    'splitEqually(%i, %i)',
    (total, count) => {
      expect(fns.splitEqually(total, count)).toEqual(splitEqually(total, count));
      expect(splitEqually(total, count).reduce((sum, v) => sum + v, 0)).toBe(total);
    },
  );
});
