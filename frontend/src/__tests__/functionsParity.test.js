// Cloud Functions liczą kwoty do powiadomień własną kopią logiki podziału
// (osobny pakiet CommonJS, nie może zaimportować modułów z `src/`). Ten test
// pilnuje, żeby obie implementacje nigdy się nie rozjechały — inaczej push
// pokazywałby inną stawkę niż karta gracza w aplikacji.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { getSessionShares } from '../utils/sessionCost';

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
    label: 'ping-pong, wszyscy z kartą — nikt nie płaci',
    session: { sport: 'pingpong', cost: 100, present: ['A', 'B'], multiPlayers: ['A', 'B'] },
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
    label: 'badminton z dogrywką',
    session: {
      sport: 'badminton', cost: 88, present: ['A', 'B', 'C'],
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
];

describe('Cloud Functions liczą koszty identycznie jak aplikacja', () => {
  it.each(SESSIONS)('$label', ({ session }) => {
    expect(fns.getSessionShares(session)).toEqual(getSessionShares(session));
  });

  it.each(SESSIONS)('$label — suma udziałów pokrywa całą kwotę sesji', ({ session }) => {
    const shares = fns.getSessionShares(session);
    const allocated = Object.values(shares.byPlayer)
      .reduce((sum, s) => sum + Math.round(s.total * 100), 0);
    const expected = Math.round((Number.isFinite(session.cost) ? session.cost : 0) * 100)
      + Math.round((session.overtimeCost || 0) * 100);

    expect(allocated + Math.round(shares.unallocated * 100)).toBe(expected);
  });
});
