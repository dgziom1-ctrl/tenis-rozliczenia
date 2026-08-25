import { describe, it, expect } from 'vitest';
import { roundToTwoDecimals } from '../utils/money';
import { calculateDebt, buildDebtDisplayData } from '../utils/debt';
import { calculatePlayerStats, assignRankingPlaces } from '../utils/rankings';
import { groupSessionsByMonth, groupHistoryByMonth } from '../utils/sessions';

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
    expect(calculateDebt('Kamil', { weeks })).toBe(0);
  });

  it('calculates full debt when no payment recorded', () => {
    // w1: 60/3 = 20; w2: cena pełna (60 + 15)/2 = 37,50, Alice bez karty; w3: 90/3 = 30
    const debt = calculateDebt('Alice', { weeks });
    expect(debt).toBe(roundToTwoDecimals(20 + 37.5 + 30));
  });

  it('subtracts recorded payments', () => {
    const payments = { Alice: [{ id: 'p1', amount: 80, date: '2025-01-14' }] };
    expect(calculateDebt('Alice', { weeks, payments })).toBe(7.5); // 87,50 - 80
  });

  it('multisport player pays 15 zł less that week', () => {
    // Bob ma kartę w w2 → 37,50 - 15 = 22,50
    const debt = calculateDebt('Bob', { weeks });
    expect(debt).toBe(roundToTwoDecimals(20 + 22.5 + 30));
  });

  it('multisport discount does not change the session total', () => {
    const w2 = [weeks[1]];
    const total = ['Alice', 'Bob'].reduce((sum, p) => sum + calculateDebt(p, { weeks: w2 }), 0);
    expect(total).toBe(60);
  });

  it('returns 0 when player was never present', () => {
    expect(calculateDebt('Dave', { weeks })).toBe(0);
  });

  it('returns 0 when payments cover everything', () => {
    const payments = { Alice: [{ id: 'p1', amount: 87.5, date: '2025-01-21' }] };
    expect(calculateDebt('Alice', { weeks, payments })).toBe(0);
  });
});

// ─── buildDebtDisplayData ─────────────────────────────────────────────────────

describe('buildDebtDisplayData', () => {
  const history = [
    { id: 'w3', datePlayed: '2025-01-20', sport: 'pingpong', totalCost: 60, costPerPerson: 30, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
    { id: 'w2', datePlayed: '2025-01-13', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'],        multisportPlayers: [] },
    { id: 'w1', datePlayed: '2025-01-06', sport: 'pingpong', totalCost: 30, costPerPerson: 15, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
  ];
  const alice = { name: 'Alice', attendanceCount: 3, currentDebt: 65, eligibleWeeks: 3, joinDate: null };

  it('wypisuje sesje od najstarszej', () => {
    const data = buildDebtDisplayData(alice, history, {});
    expect(data.sessions.map(s => s.sessionId)).toEqual(['w1', 'w2', 'w3']);
  });

  it('pomija sesje, w których gracza nie było', () => {
    const carol = { name: 'Carol', attendanceCount: 0, currentDebt: 0, eligibleWeeks: 3, joinDate: null };
    expect(buildDebtDisplayData(carol, history, {}).sessions).toHaveLength(0);
  });

  it('saldo to suma sesji minus suma wpłat', () => {
    const payments = { Alice: [{ id: 'p1', amount: 25, date: '2025-01-21' }] };
    const data = buildDebtDisplayData(alice, history, payments);
    expect(data.totalSessions).toBe(65);
    expect(data.totalPaid).toBe(25);
    expect(data.balance).toBe(40);
  });

  it('radzi sobie z brakiem wpłat gracza', () => {
    const data = buildDebtDisplayData(alice, history, {});
    expect(data.payments).toEqual([]);
    expect(data.totalPaid).toBe(0);
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

