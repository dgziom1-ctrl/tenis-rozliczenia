import { describe, it, expect } from 'vitest';
import {
  roundToTwoDecimals,
  calculateDebt,
  calculateDebtBreakdown,
  calculatePlayerStats,
  assignRankingPlaces,
  groupSessionsByMonth,
  groupHistoryByMonth,
  getSpecialTitle,
} from '../utils/calculations';

// ─── roundToTwoDecimals ────────────────────────────────────────────────────────

describe('roundToTwoDecimals', () => {
  it('rounds down', () => expect(roundToTwoDecimals(1.234)).toBe(1.23));
  it('rounds up',   () => expect(roundToTwoDecimals(1.235)).toBe(1.24));
  it('handles zero', () => expect(roundToTwoDecimals(0)).toBe(0));
  it('handles whole numbers', () => expect(roundToTwoDecimals(5)).toBe(5));
  it('handles floating point noise', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3);
  });
});

// ─── calculateDebt ────────────────────────────────────────────────────────────

describe('calculateDebt', () => {
  const weeks = [
    { id: 'w1', date: '2025-01-06', cost: 60, present: ['Alice', 'Bob', 'Kamil'], multiPlayers: [] },
    { id: 'w2', date: '2025-01-13', cost: 60, present: ['Alice', 'Bob'],          multiPlayers: ['Bob'] },
    { id: 'w3', date: '2025-01-20', cost: 90, present: ['Alice', 'Bob', 'Carol'], multiPlayers: [] },
  ];

  it('returns 0 for organizer (Kamil)', () => {
    expect(calculateDebt('Kamil', { weeks, paidUntilWeek: {} })).toBe(0);
  });

  it('calculates full debt when no payment recorded', () => {
    // w1: 60 / 3 paying = 20; w2: Alice pays full 60 (Bob has Multi); w3: 90 / 3 = 30
    const debt = calculateDebt('Alice', { weeks, paidUntilWeek: {} });
    expect(debt).toBe(roundToTwoDecimals(20 + 60 + 30));
  });

  it('skips weeks already paid for', () => {
    // paidUntilWeek = w2 → only w3 is owed
    const debt = calculateDebt('Alice', { weeks, paidUntilWeek: { Alice: 'w2' } });
    expect(debt).toBe(30); // 90/3
  });

  it('multisport player pays nothing for that week', () => {
    // Bob has Multi in w2 → should not owe for w2
    const debt = calculateDebt('Bob', { weeks, paidUntilWeek: {} });
    // w1: 60/3 paying = 20; w2: Bob is multi, pays 0; w3: 90/3 = 30
    expect(debt).toBe(roundToTwoDecimals(20 + 0 + 30));
  });

  it('returns 0 when player was never present', () => {
    expect(calculateDebt('Dave', { weeks, paidUntilWeek: {} })).toBe(0);
  });

  it('returns 0 when all weeks are paid', () => {
    const debt = calculateDebt('Alice', { weeks, paidUntilWeek: { Alice: 'w3' } });
    expect(debt).toBe(0);
  });
});

// ─── calculateDebtBreakdown ────────────────────────────────────────────────────

describe('calculateDebtBreakdown', () => {
  const history = [
    { id: 'w3', datePlayed: '2025-01-20', costPerPerson: 30, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
    { id: 'w2', datePlayed: '2025-01-13', costPerPerson: 20, presentPlayers: ['Alice'],        multisportPlayers: [] },
    { id: 'w1', datePlayed: '2025-01-06', costPerPerson: 15, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
  ];

  it('returns empty array when debt is 0', () => {
    expect(calculateDebtBreakdown('Alice', 0, history)).toEqual([]);
  });

  it('returns empty array when history is empty', () => {
    expect(calculateDebtBreakdown('Alice', 50, [])).toEqual([]);
  });

  it('builds breakdown from newest sessions first', () => {
    const breakdown = calculateDebtBreakdown('Alice', 50, history);
    // newest first: w3(30) + w2(20) = 50, stops there
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].sessionId).toBe('w3');
    expect(breakdown[1].sessionId).toBe('w2');
  });

  it('skips sessions where player was not present', () => {
    // Carol is not in any session
    const breakdown = calculateDebtBreakdown('Carol', 30, history);
    expect(breakdown).toHaveLength(0);
  });
});

// ─── calculatePlayerStats ─────────────────────────────────────────────────────

describe('calculatePlayerStats', () => {
  const players = [
    { name: 'Alice', attendanceCount: 3, currentDebt: 50 },
    { name: 'Bob',   attendanceCount: 1, currentDebt: 10 },
  ];

  const history = [
    { id: 'w3', datePlayed: '2025-01-20', presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
    { id: 'w2', datePlayed: '2025-01-13', presentPlayers: ['Alice'],        multisportPlayers: ['Alice'] },
    { id: 'w1', datePlayed: '2025-01-06', presentPlayers: ['Alice'],        multisportPlayers: [] },
  ];

  it('calculates attendance percentage', () => {
    const stats = calculatePlayerStats(players, history, 4);
    const alice = stats.find(p => p.name === 'Alice');
    expect(alice.attendancePercentage).toBe(75); // 3/4 = 75%
  });

  it('counts current streak (consecutive sessions from most recent)', () => {
    const stats = calculatePlayerStats(players, history, 3);
    const alice = stats.find(p => p.name === 'Alice');
    expect(alice.currentStreak).toBe(3); // present in all 3 most recent
    const bob = stats.find(p => p.name === 'Bob');
    expect(bob.currentStreak).toBe(1);   // present only in w3 (most recent)
  });

  it('counts multisport appearances', () => {
    const stats = calculatePlayerStats(players, history, 3);
    const alice = stats.find(p => p.name === 'Alice');
    expect(alice.multisportCount).toBe(1); // only w2
  });

  it('handles empty history', () => {
    const stats = calculatePlayerStats(players, [], 0);
    expect(stats[0].currentStreak).toBe(0);
    expect(stats[0].attendancePercentage).toBe(0);
  });
});

// ─── assignRankingPlaces ──────────────────────────────────────────────────────

describe('assignRankingPlaces', () => {
  it('assigns sequential places', () => {
    const input = [
      { name: 'A', attendancePercentage: 90 },
      { name: 'B', attendancePercentage: 70 },
      { name: 'C', attendancePercentage: 50 },
    ];
    const result = assignRankingPlaces(input);
    expect(result.map(p => p.place)).toEqual([1, 2, 3]);
  });

  it('assigns same place for tied percentages', () => {
    const input = [
      { name: 'A', attendancePercentage: 80 },
      { name: 'B', attendancePercentage: 80 },
      { name: 'C', attendancePercentage: 50 },
    ];
    const result = assignRankingPlaces(input);
    expect(result[0].place).toBe(1);
    expect(result[1].place).toBe(1); // tied
    expect(result[2].place).toBe(3); // skips place 2
  });
});

// ─── groupSessionsByMonth ─────────────────────────────────────────────────────

describe('groupSessionsByMonth', () => {
  const history = [
    { id: 'w1', datePlayed: '2025-01-06', presentPlayers: ['Alice', 'Bob'],   multisportPlayers: [] },
    { id: 'w2', datePlayed: '2025-01-13', presentPlayers: ['Alice'],          multisportPlayers: [] },
    { id: 'w3', datePlayed: '2025-02-03', presentPlayers: ['Alice', 'Carol'], multisportPlayers: [] },
  ];

  it('groups by month key', () => {
    const result = groupSessionsByMonth(history);
    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe('2025-02'); // sorted newest first
    expect(result[1][0]).toBe('2025-01');
  });

  it('counts sessions per month', () => {
    const result = groupSessionsByMonth(history);
    const jan = result.find(([k]) => k === '2025-01');
    expect(jan[1].total).toBe(2);
  });

  it('counts player appearances per month', () => {
    const result = groupSessionsByMonth(history);
    const jan = result.find(([k]) => k === '2025-01');
    expect(jan[1].players['Alice']).toBe(2);
    expect(jan[1].players['Bob']).toBe(1);
  });
});

// ─── groupHistoryByMonth ──────────────────────────────────────────────────────

describe('groupHistoryByMonth', () => {
  const history = [
    { id: 'w3', datePlayed: '2025-03-01' },
    { id: 'w2', datePlayed: '2025-02-15' },
    { id: 'w1', datePlayed: '2025-02-01' },
  ];

  it('groups rows by month label', () => {
    const groups = groupHistoryByMonth(history);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toMatch(/Marzec 2025/);
    expect(groups[1].label).toMatch(/Luty 2025/);
  });

  it('puts correct rows in each group', () => {
    const groups = groupHistoryByMonth(history);
    expect(groups[1].rows).toHaveLength(2); // February has 2 sessions
  });
});

// ─── getSpecialTitle ──────────────────────────────────────────────────────────

describe('getSpecialTitle', () => {
  const base = [
    { name: 'A', currentStreak: 5, multisportCount: 2, attendanceCount: 20 },
    { name: 'B', currentStreak: 2, multisportCount: 5, attendanceCount: 15 },
    { name: 'C', currentStreak: 1, multisportCount: 1, attendanceCount: 5  },
  ];

  it('awards streak title to unique leader with streak >= 2', () => {
    const title = getSpecialTitle(base[0], base);
    expect(title?.icon).toBe('🔥');
  });

  it('awards Multi King to unique multisport leader', () => {
    const title = getSpecialTitle(base[1], base);
    expect(title?.label).toBe('Multi King');
  });

  it('awards attendance king', () => {
    const title = getSpecialTitle(base[0], base);
    // A has highest streak → streak takes priority
    expect(title).not.toBeNull();
  });

  it('returns null when allPlayers is empty', () => {
    expect(getSpecialTitle(base[0], [])).toBeNull();
  });

  it('no title when streak is tied', () => {
    const tied = [
      { name: 'A', currentStreak: 5, multisportCount: 1, attendanceCount: 10 },
      { name: 'B', currentStreak: 5, multisportCount: 1, attendanceCount: 10 },
    ];
    // Neither A nor B is unique streak leader → no streak title
    const title = getSpecialTitle(tied[0], tied);
    expect(title?.icon).not.toBe('🔥');
  });
});
