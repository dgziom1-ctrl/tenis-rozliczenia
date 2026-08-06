/**
 * ROBUSTNESS / EXPLORATORY / BRUTE-FORCE TESTS
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateDebt, calculateDebtBreakdown } from '../utils/debt';
import { assignRankingPlaces } from '../utils/rankings';
import { getPlayerBadge } from '../utils/achievements';
import { buildUIData } from '../lib/firebase/transforms';
import { formatDate, formatAmount } from '../utils/format';
import * as stateModule from '../lib/firebase/state';

// ─── vi.hoisted: runs BEFORE vi.mock factories ────────────────────────────────
const { mockSaveData, runTransactionImpl } = vi.hoisted(() => {
  const mockSaveData = vi.fn().mockResolvedValue(undefined);

  // runTransaction reads from stateModule.getCurrentData(), applies the update fn,
  // persists result into state and captures it via mockSaveData.
  const runTransactionImpl = vi.fn(async (_ref, updateFn) => {
    const current = stateModule.getCurrentData()
      ? JSON.parse(JSON.stringify(stateModule.getCurrentData()))
      : null;
    const result = updateFn(current);
    if (result !== undefined) {
      stateModule.setCurrentData(result);
      await mockSaveData(result);
    }
  });

  return { mockSaveData, runTransactionImpl };
});

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));

vi.mock('firebase/database', () => ({
  getDatabase:     vi.fn(() => ({})),
  ref:             vi.fn(() => ({})),
  onValue:         vi.fn(),
  set:             vi.fn().mockResolvedValue(undefined),
  runTransaction:  runTransactionImpl,
}));

vi.mock('../lib/firebase/config', () => ({ database: {}, dataRef: {} }));

// ─── Import Firebase modules AFTER mocks ─────────────────────────────────────
const { addSession, deleteWeek, updateWeek } = await import('../lib/firebase/mutations/sessions');
const { addPlayer, softDeletePlayer, restorePlayer } = await import('../lib/firebase/mutations/players');
const { addPayment, removePayment } = await import('../lib/firebase/mutations/payments');

// ─── Helper: seed in-memory Firebase state ────────────────────────────────────
function seed(data) {
  stateModule.setCurrentData({
    players: [], weeks: [],
    defaultMultiPlayers: [], playerJoinWeek: {}, deletedPlayers: [],
    payments: {},
    ...data,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// calculateDebt — ROBUSTNESS
// ══════════════════════════════════════════════════════════════════════════════

describe('calculateDebt — robustness', () => {
  it('empty data returns 0', () =>
    expect(calculateDebt('Alice', { weeks: [] })).toBe(0));

  it('null payments handled', () => {
    const weeks = [{ id: 'w1', cost: 60, present: ['Alice'], multiPlayers: [] }];
    expect(calculateDebt('Alice', { weeks, payments: null })).toBeGreaterThan(0);
  });

  it('player not in any session → 0', () => {
    const weeks = [{ id: 'w1', cost: 60, present: ['Bob'], multiPlayers: [] }];
    expect(calculateDebt('Ghost', { weeks })).toBe(0);
  });

  it('organizer always 0', () => {
    const weeks = [{ id: 'w1', cost: 100, present: ['Kamil', 'Alice'], multiPlayers: [] }];
    expect(calculateDebt('Kamil', { weeks })).toBe(0);
  });

  it('everyone on multisport → 0 debt', () => {
    const weeks = [{ id: 'w1', cost: 60, present: ['Alice', 'Bob'], multiPlayers: ['Alice', 'Bob'] }];
    expect(calculateDebt('Alice', { weeks })).toBe(0);
  });

  it('single player pays full cost', () => {
    const weeks = [{ id: 'w1', cost: 55, present: ['Alice'], multiPlayers: [] }];
    expect(calculateDebt('Alice', { weeks })).toBe(55);
  });

  it('100/3 — reszta trafia do pierwszego gracza, nic nie ginie', () => {
    const weeks = [{ id: 'w1', cost: 100, present: ['A', 'B', 'C'], multiPlayers: [] }];
    expect(calculateDebt('A', { weeks })).toBe(33.34);
    expect(calculateDebt('B', { weeks })).toBe(33.33);
    expect(calculateDebt('C', { weeks })).toBe(33.33);
    const total = ['A', 'B', 'C'].reduce((sum, p) => sum + calculateDebt(p, { weeks }), 0);
    expect(total).toBe(100);
  });

  it('payments covering every session → 0', () => {
    const weeks = [
      { id: 'w1', cost: 60, date: '2025-01-01', present: ['Alice'], multiPlayers: [] },
      { id: 'w2', cost: 60, date: '2025-02-01', present: ['Alice'], multiPlayers: [] },
    ];
    const payments = { Alice: [{ id: 'p1', amount: 120, date: '2025-02-02' }] };
    expect(calculateDebt('Alice', { weeks, payments })).toBe(0);
  });

  it('one session paid, owes w2..w10 = 9×30', () => {
    const weeks = Array.from({ length: 10 }, (_, i) => ({
      id: `w${i + 1}`, cost: 60, present: ['Alice', 'Bob'], multiPlayers: [],
    }));
    const payments = { Alice: [{ id: 'p1', amount: 30, date: '2025-01-02' }] };
    expect(calculateDebt('Alice', { weeks, payments })).toBe(270);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// calculateDebt — BRUTE FORCE
// ══════════════════════════════════════════════════════════════════════════════

describe('calculateDebt — brute force floating point', () => {
  it('100 sessions 45zł/3 → exactly 1500', () => {
    const weeks = Array.from({ length: 100 }, (_, i) => ({
      id: `w${i}`, cost: 45, present: ['A', 'B', 'C'], multiPlayers: [],
    }));
    expect(calculateDebt('A', { weeks })).toBe(1500);
  });

  it('100 sessions 100zł/3 → finite result', () => {
    const weeks = Array.from({ length: 100 }, (_, i) => ({
      id: `w${i}`, cost: 100, present: ['A', 'B', 'C'], multiPlayers: [],
    }));
    expect(Number.isFinite(calculateDebt('A', { weeks }))).toBe(true);
  });

  it('alternating multisport — 10/20 sessions paying = 300', () => {
    const weeks = Array.from({ length: 20 }, (_, i) => ({
      id: `w${i}`, cost: 60, present: ['Alice', 'Bob'],
      multiPlayers: i % 2 === 0 ? ['Alice'] : [],
    }));
    expect(calculateDebt('Alice', { weeks })).toBe(300);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// calculateDebtBreakdown — new unified API
// ══════════════════════════════════════════════════════════════════════════════

describe('calculateDebtBreakdown — direction & correctness', () => {
  // history is newest-first (as buildHistory returns)
  const history = [
    { id: 'w5', datePlayed: '2025-05-01', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w4', datePlayed: '2025-04-01', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w3', datePlayed: '2025-03-01', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w2', datePlayed: '2025-02-01', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w1', datePlayed: '2025-01-01', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
  ];

  it('returns sessions oldest-first', () => {
    const b = calculateDebtBreakdown('Alice', 60, history);
    expect(b[0].sessionId).toBe('w1');
    expect(b[1].sessionId).toBe('w2');
    expect(b[2].sessionId).toBe('w3');
  });

  it('stops accumulating when debt reached', () =>
    expect(calculateDebtBreakdown('Alice', 40, history)).toHaveLength(2));

  it('skips sessions where player was absent', () => {
    const h = [
      { id: 'w3', datePlayed: '2025-03-01', sport: 'pingpong', totalCost: 30, costPerPerson: 30, presentPlayers: ['Bob'],         multisportPlayers: [] },
      { id: 'w2', datePlayed: '2025-02-01', sport: 'pingpong', totalCost: 30, costPerPerson: 30, presentPlayers: ['Alice'],        multisportPlayers: [] },
      { id: 'w1', datePlayed: '2025-01-01', sport: 'pingpong', totalCost: 60, costPerPerson: 30, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
    ];
    expect(calculateDebtBreakdown('Alice', 60, h).map(x => x.sessionId)).toEqual(['w1', 'w2']);
  });

  it('skips multisport sessions', () => {
    const h = [
      { id: 'w2', datePlayed: '2025-02-01', sport: 'pingpong', totalCost: 30, costPerPerson: 30, presentPlayers: ['Alice'], multisportPlayers: ['Alice'] },
      { id: 'w1', datePlayed: '2025-01-01', sport: 'pingpong', totalCost: 30, costPerPerson: 30, presentPlayers: ['Alice'], multisportPlayers: [] },
    ];
    const b = calculateDebtBreakdown('Alice', 30, h);
    expect(b).toHaveLength(1);
    expect(b[0].sessionId).toBe('w1');
  });

  it('returns empty for 0 debt', () =>
    expect(calculateDebtBreakdown('Alice', 0, history)).toHaveLength(0));

  it('returns empty for unknown player', () =>
    expect(calculateDebtBreakdown('Ghost', 100, history)).toHaveLength(0));
});

// ══════════════════════════════════════════════════════════════════════════════
// buildUIData — integration pipeline
// ══════════════════════════════════════════════════════════════════════════════

describe('buildUIData — integration', () => {
  it('empty database returns safe defaults', () => {
    const r = buildUIData({});
    expect(r.players).toEqual([]);
    expect(r.history).toEqual([]);
    expect(r.summary.totalWeeks).toBe(0);
    expect(r.summary.totalToCollect).toBe(0);
  });

  it('organizer not counted in totalToCollect', () => {
    const raw = {
      players: ['Kamil', 'Alice'],
      weeks: [{ id: 'w1', date: '2025-01-01', cost: 60, present: ['Kamil', 'Alice'], multiPlayers: [] }],    };
    const r = buildUIData(raw);
    expect(r.summary.totalToCollect).toBe(30);
    // organizer is visible on dashboard/ranking but not counted in totalToCollect
    expect(r.players.find(p => p.name === 'Kamil')).toBeDefined();
  });

  it('history is reversed (newest first)', () => {
    const raw = {
      players: ['Alice'],
      weeks: [
        { id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice'], multiPlayers: [] },
        { id: 'w2', date: '2025-02-01', cost: 60, present: ['Alice'], multiPlayers: [] },
      ],    };
    const r = buildUIData(raw);
    expect(r.history[0].id).toBe('w2');
    expect(r.history[1].id).toBe('w1');
  });

  it('costPerPerson is 0 when everyone on multisport', () => {
    const raw = {
      players: ['Alice', 'Bob'],
      weeks: [{ id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice', 'Bob'], multiPlayers: ['Alice', 'Bob'] }],    };
    expect(buildUIData(raw).history[0].costPerPerson).toBe(0);
  });

  it('players sorted by debt descending', () => {
    const raw = {
      players: ['Alice', 'Bob', 'Carol'],
      weeks: [{ id: 'w1', date: '2025-01-01', cost: 90, present: ['Alice', 'Bob', 'Carol'], multiPlayers: ['Bob', 'Carol'] }],    };
    const r = buildUIData(raw);
    expect(r.players[0].name).toBe('Alice');
    expect(r.players[0].currentDebt).toBe(90);
  });

  it('playerJoinWeek respected in attendanceCount', () => {
    const raw = {
      players: ['Alice', 'NewGuy'],
      weeks: [
        { id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice'],           multiPlayers: [] },
        { id: 'w2', date: '2025-02-01', cost: 60, present: ['Alice', 'NewGuy'], multiPlayers: [] },
      ],      playerJoinWeek: { NewGuy: 1 },
    };
    expect(buildUIData(raw).players.find(p => p.name === 'NewGuy').attendanceCount).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// deleteWeek
// ══════════════════════════════════════════════════════════════════════════════

describe('deleteWeek', () => {
  beforeEach(() => mockSaveData.mockClear());

  it('removes only the requested week', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }] });
    await deleteWeek('w2');
    expect(mockSaveData.mock.calls[0][0].weeks.map(w => w.id)).toEqual(['w1', 'w3']);
  });

  it('leaves the payments ledger untouched', async () => {
    const payments = { Alice: [{ id: 'p1', amount: 30, date: '2025-01-02' }] };
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }], payments });
    await deleteWeek('w1');
    expect(mockSaveData.mock.calls[0][0].payments).toEqual(payments);
  });

  it('non-existent weekId returns error', async () => {
    seed({ weeks: [{ id: 'w1' }] });
    const result = await deleteWeek('FAKE_ID');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// addSession — validation
// ══════════════════════════════════════════════════════════════════════════════

describe('addSession — validation', () => {
  beforeEach(() => { seed({ weeks: [], players: ['Alice', 'Bob'] }); mockSaveData.mockClear(); });

  it('rejects empty presentPlayers',     async () => expect((await addSession({ datePlayed: '2025-01-01', totalCost: 60, presentPlayers: [] })).success).toBe(false));
  it('rejects null presentPlayers',      async () => expect((await addSession({ datePlayed: '2025-01-01', totalCost: 60, presentPlayers: null })).success).toBe(false));
  it('rejects negative cost',            async () => expect((await addSession({ datePlayed: '2025-01-01', totalCost: -10, presentPlayers: ['Alice'] })).success).toBe(false));
  it('rejects missing date',             async () => expect((await addSession({ datePlayed: '', totalCost: 60, presentPlayers: ['Alice'] })).success).toBe(false));

  it('rejects duplicate date', async () => {
    seed({ weeks: [{ id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice'], multiPlayers: [] }] });
    const r = await addSession({ datePlayed: '2025-01-01', totalCost: 60, presentPlayers: ['Bob'] });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/już istnieje/);
  });

  it('accepts cost = 0', async () =>
    expect((await addSession({ datePlayed: '2025-01-01', totalCost: 0, presentPlayers: ['Alice'] })).success).toBe(true));
});

// ══════════════════════════════════════════════════════════════════════════════
// addPlayer — trim, duplicates, edge cases
// ══════════════════════════════════════════════════════════════════════════════

describe('addPlayer — robustness', () => {
  beforeEach(() => { seed({ players: ['Alice'], weeks: [] }); mockSaveData.mockClear(); });

  it('trims whitespace before duplicate check', async () => expect((await addPlayer('Alice ')).success).toBe(false));
  it('trims leading+trailing whitespace',       async () => expect((await addPlayer('  Alice  ')).success).toBe(false));
  it('rejects empty string',                    async () => expect((await addPlayer('')).success).toBe(false));
  it('rejects whitespace-only',                 async () => expect((await addPlayer('   ')).success).toBe(false));
  it('rejects null',                            async () => expect((await addPlayer(null)).success).toBe(false));

  it('sets playerJoinWeek to current week count', async () => {
    seed({ players: ['Alice'], weeks: [{ id: 'w1' }, { id: 'w2' }] });
    await addPlayer('NewGuy');
    expect(mockSaveData.mock.calls[0][0].playerJoinWeek.NewGuy).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// addPayment / removePayment — księga wpłat
// ══════════════════════════════════════════════════════════════════════════════

describe('addPayment / removePayment — payment ledger', () => {
  beforeEach(() => mockSaveData.mockClear());

  const twoWeeks = () => ([
    { id: 'w1', cost: 60, date: '2025-01-01', present: ['Alice'], multiPlayers: [] },
    { id: 'w2', cost: 60, date: '2025-02-01', present: ['Alice'], multiPlayers: [] },
  ]);

  it('paying the full balance clears the debt', async () => {
    const weeks = twoWeeks();
    seed({ weeks });
    await addPayment('Alice', calculateDebt('Alice', { weeks }));
    expect(calculateDebt('Alice', stateModule.getCurrentData())).toBe(0);
  });

  it('records a payment once even when retried with the same id', async () => {
    seed({ weeks: twoWeeks() });
    await addPayment('Alice', 25, 'retry-me');
    await addPayment('Alice', 25, 'retry-me');
    expect(stateModule.getCurrentData().payments.Alice).toHaveLength(1);
  });

  it('undoing a payment removes only that one', async () => {
    seed({ weeks: twoWeeks() });
    await addPayment('Alice', 25, 'first');
    await addPayment('Alice', 10, 'second');
    await removePayment('Alice', 'first');

    const payments = stateModule.getCurrentData().payments.Alice;
    expect(payments.map(p => p.id)).toEqual(['second']);
  });

  it('undo → debt returns to its previous value', async () => {
    const weeks = twoWeeks();
    seed({ weeks });
    const debtBefore = calculateDebt('Alice', { weeks });
    await addPayment('Alice', debtBefore, 'settle-it');
    await removePayment('Alice', 'settle-it');
    expect(calculateDebt('Alice', stateModule.getCurrentData())).toBe(debtBefore);
  });

  it('reports failure when the payment is already gone', async () => {
    seed({ weeks: twoWeeks() });
    await addPayment('Alice', 25, 'gone');
    await removePayment('Alice', 'gone');
    expect((await removePayment('Alice', 'gone')).success).toBe(false);
  });

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['zero', 0],
    ['negative', -5],
    ['absurdly large', 1e9],
  ])('rejects a %s amount', async (_label, amount) => {
    seed({ weeks: [] });
    expect((await addPayment('Alice', amount)).success).toBe(false);
    expect(mockSaveData).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Odporność na obcy zapis w appData
// ══════════════════════════════════════════════════════════════════════════════

describe('calculateDebt — ignores stray appData keys', () => {
  const weeks = [
    { id: 'w1', cost: 60, date: '2025-01-01', present: ['Alice'], multiPlayers: [] },
    { id: 'w2', cost: 60, date: '2025-02-01', present: ['Alice'], multiPlayers: [] },
    { id: 'w3', cost: 60, date: '2025-03-01', present: ['Alice'], multiPlayers: [] },
  ];
  const payments = {
    Alice: [
      { id: 'p1', amount: 60, date: '2025-01-02' },
      { id: 'p2', amount: 60, date: '2025-02-02' },
    ],
  };

  it('a paidUntilWeek entry has no effect on the balance', () => {
    const expected = calculateDebt('Alice', { weeks, payments });
    expect(expected).toBe(60);
    expect(calculateDebt('Alice', { weeks, payments, paidUntilWeek: { Alice: 'w2' } })).toBe(expected);
    expect(calculateDebt('Alice', { weeks, payments, paidUntilWeek: { Alice: 'w3' } })).toBe(expected);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// softDeletePlayer / restorePlayer
// ══════════════════════════════════════════════════════════════════════════════

describe('softDeletePlayer / restorePlayer', () => {
  beforeEach(() => { mockSaveData.mockClear(); seed({ players: ['Alice', 'Bob'], deletedPlayers: [], weeks: [] }); });

  it('moves player from active to deleted', async () => {
    await softDeletePlayer('Alice');
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.players).not.toContain('Alice');
    expect(saved.deletedPlayers).toContain('Alice');
  });

  it('restores player back to active', async () => {
    seed({ players: ['Bob'], deletedPlayers: ['Alice'], weeks: [] });
    await restorePlayer('Alice');
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.players).toContain('Alice');
    expect(saved.deletedPlayers).not.toContain('Alice');
  });

  it('deleting a non-existent player fails without touching the roster', async () => {
    const result = await softDeletePlayer('Ghost');
    expect(result.success).toBe(false);
    expect(mockSaveData).not.toHaveBeenCalled();
  });

  it('restoring a player already on the roster does not duplicate them', async () => {
    seed({ players: ['Alice'], deletedPlayers: ['Alice'], weeks: [] });
    await restorePlayer('Alice');
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.players.filter(p => p === 'Alice')).toHaveLength(1);
  });

  it('refuses to re-add a name that already carries settlement history', async () => {
    seed({
      players: ['Bob'],
      deletedPlayers: [],
      weeks: [{ id: 'w1', cost: 60, date: '2025-01-01', present: ['Alice'], multiPlayers: [] }],
    });
    const result = await addPlayer('Alice');
    expect(result.success).toBe(false);
    expect(mockSaveData).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updateWeek — edge cases
// ══════════════════════════════════════════════════════════════════════════════

describe('updateWeek — edge cases', () => {
  beforeEach(() => mockSaveData.mockClear());

  it('returns error for non-existent weekId', async () => {
    seed({ weeks: [{ id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice'], multiPlayers: [] }] });
    expect((await updateWeek('FAKE', { date: '2025-01-01', cost: 60, present: ['Alice'], multiPlayers: [] })).success).toBe(false);
  });

  it('updates only target week', async () => {
    seed({ weeks: [
      { id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice'], multiPlayers: [] },
      { id: 'w2', date: '2025-02-01', cost: 60, present: ['Bob'],   multiPlayers: [] },
    ]});
    await updateWeek('w1', { date: '2025-01-15', cost: 90, present: ['Alice', 'Bob'], multiPlayers: [] });
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.weeks[0].cost).toBe(90);
    expect(saved.weeks[1].cost).toBe(60);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// formatDate / formatAmount — boundary
// ══════════════════════════════════════════════════════════════════════════════

describe('formatDate — boundary', () => {
  it('valid ISO',            () => expect(formatDate('2025-12-31')).toBe('31.12.2025'));
  it('leap year Feb 29',     () => expect(formatDate('2024-02-29')).toBe('29.02.2024'));
  it('null → empty',         () => expect(formatDate(null)).toBe(''));
  it('undefined → empty',    () => expect(formatDate(undefined)).toBe(''));
  it('empty string → empty', () => expect(formatDate('')).toBe(''));
});

describe('formatAmount — boundary', () => {
  it('0',              () => expect(formatAmount(0)).toBe('0,00 zł'));
  it('large number',   () => expect(formatAmount(99999.99)).toBe('99999,99 zł'));
  it('negative',       () => expect(formatAmount(-5.5)).toBe('-5,50 zł'));
  it('string input',   () => expect(formatAmount('13.75')).toBe('13,75 zł'));
  it('without symbol', () => expect(formatAmount(10, false)).toBe('10,00'));
});

// ══════════════════════════════════════════════════════════════════════════════
// assignRankingPlaces — exploratory
// ══════════════════════════════════════════════════════════════════════════════

describe('assignRankingPlaces — exploratory', () => {
  it('single player → place 1', () =>
    expect(assignRankingPlaces([{ attendancePercentage: 50 }])[0].place).toBe(1));

  it('all tied → all place 1', () => {
    const r = assignRankingPlaces([
      { attendancePercentage: 75 }, { attendancePercentage: 75 }, { attendancePercentage: 75 },
    ]);
    expect(r.every(p => p.place === 1)).toBe(true);
  });

  it('3-way tie then 4th → place 4', () => {
    const r = assignRankingPlaces([
      { attendancePercentage: 80 }, { attendancePercentage: 80 },
      { attendancePercentage: 80 }, { attendancePercentage: 50 },
    ]);
    expect(r[3].place).toBe(4);
  });

  it('empty array → empty array', () =>
    expect(assignRankingPlaces([])).toHaveLength(0));
});

// ══════════════════════════════════════════════════════════════════════════════
// getPlayerBadge — edge cases
// ══════════════════════════════════════════════════════════════════════════════

describe('getPlayerBadge — edge cases', () => {
  it('sole player gets attendance king', () => {
    const p = { name: 'A', currentStreak: 0, multisportCount: 0, attendanceCount: 5, attendancePercentage: 50 };
    expect(getPlayerBadge(p, [p])?.icon).toBe('👑');
  });

  it('streak=1 does not award streak title', () => {
    const players = [
      { name: 'A', currentStreak: 1, multisportCount: 0, attendanceCount: 10, attendancePercentage: 80 },
      { name: 'B', currentStreak: 0, multisportCount: 0, attendanceCount: 5,  attendancePercentage: 50 },
    ];
    expect(getPlayerBadge(players[0], players)?.icon).not.toBe('🔥');
  });

  it('ghost title requires attendancePercentage < 40', () => {
    const players = [
      { name: 'A', currentStreak: 3, multisportCount: 2, attendanceCount: 10, attendancePercentage: 70 },
      { name: 'B', currentStreak: 0, multisportCount: 0, attendanceCount: 1,  attendancePercentage: 10 },
    ];
    expect(getPlayerBadge(players[1], players)?.icon).toBe('💀');
  });

  it('no title when all metrics tied', () => {
    const players = [
      { name: 'A', currentStreak: 3, multisportCount: 3, attendanceCount: 10, attendancePercentage: 70 },
      { name: 'B', currentStreak: 3, multisportCount: 3, attendanceCount: 10, attendancePercentage: 70 },
    ];
    expect(getPlayerBadge(players[0], players)).toBeNull();
  });
});
