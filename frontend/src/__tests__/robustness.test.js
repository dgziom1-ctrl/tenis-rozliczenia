/**
 * ROBUSTNESS / EXPLORATORY / BRUTE-FORCE TESTS
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateDebt,
  calculateDebtBreakdown,
  assignRankingPlaces,
  getSpecialTitle,
} from '../utils/calculations';
import { buildUIData } from '../firebase/subscriptions';
import { formatDate, formatAmount } from '../utils/format';
import * as stateModule from '../firebase/state';

// ─── vi.hoisted: runs BEFORE vi.mock factories ────────────────────────────────
const { mockSaveData, runTransactionImpl } = vi.hoisted(() => {
  const mockSaveData = vi.fn().mockResolvedValue(undefined);

  // runTransaction reads from stateModule._currentData, applies the update fn,
  // persists result into state and captures it via mockSaveData.
  const runTransactionImpl = vi.fn(async (_ref, updateFn) => {
    const current = stateModule._currentData
      ? JSON.parse(JSON.stringify(stateModule._currentData))
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

vi.mock('../firebase/config', () => ({ database: {}, dataRef: {} }));

// ─── Import Firebase modules AFTER mocks ─────────────────────────────────────
const { addSession, deleteWeek, updateWeek } = await import('../firebase/weeks');
const { addPlayer, softDeletePlayer, restorePlayer } = await import('../firebase/players');
const { settlePlayer, undoSettle } = await import('../firebase/payments');

// ─── Helper: seed in-memory Firebase state ────────────────────────────────────
function seed(data) {
  stateModule.setCurrentData({
    players: [], weeks: [], paidUntilWeek: {},
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
    expect(calculateDebt('Alice', { weeks: [], paidUntilWeek: {} })).toBe(0));

  it('null paidUntilWeek handled', () => {
    const weeks = [{ id: 'w1', cost: 60, present: ['Alice'], multiPlayers: [] }];
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: null })).toBeGreaterThan(0);
  });

  it('player not in any session → 0', () => {
    const weeks = [{ id: 'w1', cost: 60, present: ['Bob'], multiPlayers: [] }];
    expect(calculateDebt('Ghost', { weeks, paidUntilWeek: {} })).toBe(0);
  });

  it('organizer always 0', () => {
    const weeks = [{ id: 'w1', cost: 100, present: ['Kamil', 'Alice'], multiPlayers: [] }];
    expect(calculateDebt('Kamil', { weeks, paidUntilWeek: {} })).toBe(0);
  });

  it('stale paidUntilWeek ID → full debt', () => {
    const weeks = [
      { id: 'w1', cost: 60, present: ['Alice'], multiPlayers: [] },
      { id: 'w2', cost: 60, present: ['Alice'], multiPlayers: [] },
    ];
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: { Alice: 'DELETED_ID' } }))
      .toBe(calculateDebt('Alice', { weeks, paidUntilWeek: {} }));
  });

  it('everyone on multisport → 0 debt', () => {
    const weeks = [{ id: 'w1', cost: 60, present: ['Alice', 'Bob'], multiPlayers: ['Alice', 'Bob'] }];
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: {} })).toBe(0);
  });

  it('single player pays full cost', () => {
    const weeks = [{ id: 'w1', cost: 55, present: ['Alice'], multiPlayers: [] }];
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: {} })).toBe(55);
  });

  it('100/3 rounded to 2dp', () => {
    const weeks = [{ id: 'w1', cost: 100, present: ['A', 'B', 'C'], multiPlayers: [] }];
    expect(calculateDebt('A', { weeks, paidUntilWeek: {} })).toBe(33.33);
  });

  it('paid until last week → 0', () => {
    const weeks = [
      { id: 'w1', cost: 60, present: ['Alice'], multiPlayers: [] },
      { id: 'w2', cost: 60, present: ['Alice'], multiPlayers: [] },
    ];
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: { Alice: 'w2' } })).toBe(0);
  });

  it('paid w1, owes w2..w10 = 9×30', () => {
    const weeks = Array.from({ length: 10 }, (_, i) => ({
      id: `w${i + 1}`, cost: 60, present: ['Alice', 'Bob'], multiPlayers: [],
    }));
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: { Alice: 'w1' } })).toBe(270);
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
    expect(calculateDebt('A', { weeks, paidUntilWeek: {} })).toBe(1500);
  });

  it('100 sessions 100zł/3 → finite result', () => {
    const weeks = Array.from({ length: 100 }, (_, i) => ({
      id: `w${i}`, cost: 100, present: ['A', 'B', 'C'], multiPlayers: [],
    }));
    expect(Number.isFinite(calculateDebt('A', { weeks, paidUntilWeek: {} }))).toBe(true);
  });

  it('alternating multisport — 10/20 sessions paying = 300', () => {
    const weeks = Array.from({ length: 20 }, (_, i) => ({
      id: `w${i}`, cost: 60, present: ['Alice', 'Bob'],
      multiPlayers: i % 2 === 0 ? ['Alice'] : [],
    }));
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: {} })).toBe(300);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// calculateDebtBreakdown — new unified API
// ══════════════════════════════════════════════════════════════════════════════

describe('calculateDebtBreakdown — direction & correctness', () => {
  // history is newest-first (as buildHistory returns)
  const history = [
    { id: 'w5', datePlayed: '2025-05-01', costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w4', datePlayed: '2025-04-01', costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w3', datePlayed: '2025-03-01', costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w2', datePlayed: '2025-02-01', costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'w1', datePlayed: '2025-01-01', costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
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
      { id: 'w3', datePlayed: '2025-03-01', costPerPerson: 30, presentPlayers: ['Bob'],         multisportPlayers: [] },
      { id: 'w2', datePlayed: '2025-02-01', costPerPerson: 30, presentPlayers: ['Alice'],        multisportPlayers: [] },
      { id: 'w1', datePlayed: '2025-01-01', costPerPerson: 30, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
    ];
    expect(calculateDebtBreakdown('Alice', 60, h).map(x => x.sessionId)).toEqual(['w1', 'w2']);
  });

  it('skips multisport sessions', () => {
    const h = [
      { id: 'w2', datePlayed: '2025-02-01', costPerPerson: 30, presentPlayers: ['Alice'], multisportPlayers: ['Alice'] },
      { id: 'w1', datePlayed: '2025-01-01', costPerPerson: 30, presentPlayers: ['Alice'], multisportPlayers: [] },
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
      weeks: [{ id: 'w1', date: '2025-01-01', cost: 60, present: ['Kamil', 'Alice'], multiPlayers: [] }],
      paidUntilWeek: {},
    };
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
      ],
      paidUntilWeek: {},
    };
    const r = buildUIData(raw);
    expect(r.history[0].id).toBe('w2');
    expect(r.history[1].id).toBe('w1');
  });

  it('costPerPerson is 0 when everyone on multisport', () => {
    const raw = {
      players: ['Alice', 'Bob'],
      weeks: [{ id: 'w1', date: '2025-01-01', cost: 60, present: ['Alice', 'Bob'], multiPlayers: ['Alice', 'Bob'] }],
      paidUntilWeek: {},
    };
    expect(buildUIData(raw).history[0].costPerPerson).toBe(0);
  });

  it('players sorted by debt descending', () => {
    const raw = {
      players: ['Alice', 'Bob', 'Carol'],
      weeks: [{ id: 'w1', date: '2025-01-01', cost: 90, present: ['Alice', 'Bob', 'Carol'], multiPlayers: ['Bob', 'Carol'] }],
      paidUntilWeek: {},
    };
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
      ],
      paidUntilWeek: {},
      playerJoinWeek: { NewGuy: 1 },
    };
    expect(buildUIData(raw).players.find(p => p.name === 'NewGuy').attendanceCount).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// deleteWeek — paidUntilWeek cleanup (transaction-based)
// ══════════════════════════════════════════════════════════════════════════════

describe('deleteWeek — paidUntilWeek cleanup', () => {
  beforeEach(() => mockSaveData.mockClear());

  it('rolls back to predecessor when paid week deleted', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }], paidUntilWeek: { Alice: 'w2' } });
    await deleteWeek('w2');
    expect(mockSaveData.mock.calls[0][0].paidUntilWeek.Alice).toBe('w1');
  });

  it('removes marker when no predecessor exists', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }], paidUntilWeek: { Alice: 'w1' } });
    await deleteWeek('w1');
    expect(mockSaveData.mock.calls[0][0].paidUntilWeek.Alice).toBeUndefined();
  });

  it('leaves paidUntilWeek untouched when non-paid week deleted', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }], paidUntilWeek: { Alice: 'w1' } });
    await deleteWeek('w3');
    expect(mockSaveData.mock.calls[0][0].paidUntilWeek.Alice).toBe('w1');
  });

  it('only updates affected player', async () => {
    seed({
      weeks: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
      paidUntilWeek: { Alice: 'w2', Bob: 'w3' },
    });
    await deleteWeek('w2');
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.paidUntilWeek.Alice).toBe('w1');
    expect(saved.paidUntilWeek.Bob).toBe('w3');
  });

  it('removes all markers when only week deleted', async () => {
    seed({ weeks: [{ id: 'w1' }], paidUntilWeek: { Alice: 'w1', Bob: 'w1' } });
    await deleteWeek('w1');
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.paidUntilWeek.Alice).toBeUndefined();
    expect(saved.paidUntilWeek.Bob).toBeUndefined();
  });

  it('non-existent weekId is a no-op', async () => {
    seed({ weeks: [{ id: 'w1' }], paidUntilWeek: { Alice: 'w1' } });
    expect((await deleteWeek('FAKE_ID')).success).toBe(true);
    // transaction aborted (returns current unchanged) → saveData not called
    expect(mockSaveData).not.toHaveBeenCalled();
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
// settlePlayer / undoSettle
// ══════════════════════════════════════════════════════════════════════════════

describe('settlePlayer / undoSettle — state machine', () => {
  beforeEach(() => mockSaveData.mockClear());

  it('settles to last week ID', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }], paidUntilWeek: {} });
    await settlePlayer('Alice');
    expect(mockSaveData.mock.calls[0][0].paidUntilWeek.Alice).toBe('w3');
  });

  it('returns previousValue=null on first settle', async () => {
    seed({ weeks: [{ id: 'w1' }], paidUntilWeek: {} });
    expect((await settlePlayer('Alice')).previousValue).toBeNull();
  });

  it('returns previousValue=old week on re-settle', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }], paidUntilWeek: { Alice: 'w1' } });
    expect((await settlePlayer('Alice')).previousValue).toBe('w1');
  });

  it('undoSettle with null removes marker', async () => {
    seed({ weeks: [{ id: 'w1' }], paidUntilWeek: { Alice: 'w1' } });
    await undoSettle('Alice', null);
    expect(mockSaveData.mock.calls[0][0].paidUntilWeek.Alice).toBeUndefined();
  });

  it('undoSettle restores previous week', async () => {
    seed({ weeks: [{ id: 'w1' }, { id: 'w2' }], paidUntilWeek: { Alice: 'w2' } });
    await undoSettle('Alice', 'w1');
    expect(mockSaveData.mock.calls[0][0].paidUntilWeek.Alice).toBe('w1');
  });

  it('fails when no weeks exist', async () => {
    seed({ weeks: [], paidUntilWeek: {} });
    expect((await settlePlayer('Alice')).success).toBe(false);
  });

  it('settle → undo → original debt round-trip', async () => {
    const weeks = [
      { id: 'w1', cost: 60, date: '2025-01-01', present: ['Alice'], multiPlayers: [] },
      { id: 'w2', cost: 60, date: '2025-02-01', present: ['Alice'], multiPlayers: [] },
    ];
    seed({ weeks, paidUntilWeek: {} });
    const debtBefore = calculateDebt('Alice', { weeks, paidUntilWeek: {} });
    const { previousValue } = await settlePlayer('Alice');
    const stateAfterSettle = stateModule._currentData;
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: stateAfterSettle.paidUntilWeek })).toBe(0);
    await undoSettle('Alice', previousValue);
    const stateAfterUndo = stateModule._currentData;
    expect(calculateDebt('Alice', { weeks, paidUntilWeek: stateAfterUndo.paidUntilWeek })).toBe(debtBefore);
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

  it('deleting non-existent player is a no-op', async () => {
    await softDeletePlayer('Ghost');
    const saved = mockSaveData.mock.calls[0][0];
    expect(saved.players).toContain('Alice');
    expect(saved.players).toContain('Bob');
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
// getSpecialTitle — edge cases
// ══════════════════════════════════════════════════════════════════════════════

describe('getSpecialTitle — edge cases', () => {
  it('sole player gets attendance king', () => {
    const p = { name: 'A', currentStreak: 0, multisportCount: 0, attendanceCount: 5, attendancePercentage: 50 };
    expect(getSpecialTitle(p, [p])?.icon).toBe('👑');
  });

  it('streak=1 does not award streak title', () => {
    const players = [
      { name: 'A', currentStreak: 1, multisportCount: 0, attendanceCount: 10, attendancePercentage: 80 },
      { name: 'B', currentStreak: 0, multisportCount: 0, attendanceCount: 5,  attendancePercentage: 50 },
    ];
    expect(getSpecialTitle(players[0], players)?.icon).not.toBe('🔥');
  });

  it('ghost title requires attendancePercentage < 40', () => {
    const players = [
      { name: 'A', currentStreak: 3, multisportCount: 2, attendanceCount: 10, attendancePercentage: 70 },
      { name: 'B', currentStreak: 0, multisportCount: 0, attendanceCount: 1,  attendancePercentage: 10 },
    ];
    expect(getSpecialTitle(players[1], players)?.icon).toBe('💀');
  });

  it('no title when all metrics tied', () => {
    const players = [
      { name: 'A', currentStreak: 3, multisportCount: 3, attendanceCount: 10, attendancePercentage: 70 },
      { name: 'B', currentStreak: 3, multisportCount: 3, attendanceCount: 10, attendancePercentage: 70 },
    ];
    expect(getSpecialTitle(players[0], players)).toBeNull();
  });
});
