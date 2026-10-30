import { describe, it, expect } from 'vitest';
import { roundToTwoDecimals } from '../utils/money';
import { calculateDebt, buildDebtDisplayData } from '../utils/debt';
import { calculatePlayerStats, assignRankingPlaces, calculateSeasonPlayerStats, calculateSeasonCardStats } from '../utils/rankings';
import { groupSessionsByMonth, groupHistoryByMonth, getWrappedSeason, getCurrentSeason } from '../utils/sessions';

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

  it('bez starszych sezonów nie ma bilansu otwarcia', () => {
    expect(buildDebtDisplayData(alice, history, {}).carryOver).toBeNull();
  });
});

// ─── buildDebtDisplayData — przełom sezonu ────────────────────────────────────

describe('buildDebtDisplayData na przełomie roku', () => {
  // history jest od najnowszej sesji, tak jak zwraca buildHistory
  const history = [
    { id: 'n1', datePlayed: '2027-01-08', sport: 'pingpong', totalCost: 40, costPerPerson: 40, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'o2', datePlayed: '2026-12-18', sport: 'pingpong', totalCost: 30, costPerPerson: 30, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'o1', datePlayed: '2026-12-11', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
  ];
  const alice = { name: 'Alice', attendanceCount: 3, currentDebt: 90, eligibleWeeks: 3, joinDate: null };

  it('zwija sesje poprzedniego sezonu do jednej kwoty', () => {
    const data = buildDebtDisplayData(alice, history, {});
    expect(data.sessions.map(s => s.sessionId)).toEqual(['n1']);
    expect(data.carryOver.sessions.map(s => s.sessionId)).toEqual(['o1', 'o2']);
    expect(data.carryOver.amount).toBe(50);
    expect(data.carryOver.fromYear).toBe(2026);
    expect(data.carryOver.toYear).toBe(2026);
  });

  it('saldo zostaje ciągłe — kwota otwarcia plus sezon daje to samo co przedtem', () => {
    const data = buildDebtDisplayData(alice, history, {});
    expect(data.carryOver.amount + data.totalSessions - data.totalPaid).toBe(data.balance);
    expect(data.balance).toBe(90);
  });

  it('wpłaty rozdziela po dacie: stare do otwarcia, nowe do sezonu', () => {
    const payments = {
      Alice: [
        { id: 'p1', amount: 20, date: '2026-12-20' },
        { id: 'p2', amount: 15, date: '2027-01-09' },
      ],
    };
    const data = buildDebtDisplayData(alice, history, payments);
    expect(data.carryOver.amount).toBe(30);
    expect(data.payments.map(p => p.id)).toEqual(['p2']);
    expect(data.totalPaid).toBe(15);
    expect(data.balance).toBe(55);
  });

  it('zamknięty na czysto rok daje bilans otwarcia zero, ale wciąż widoczny', () => {
    const payments = { Alice: [{ id: 'p1', amount: 50, date: '2026-12-30' }] };
    const data = buildDebtDisplayData(alice, history, payments);
    expect(data.carryOver.amount).toBe(0);
    expect(data.balance).toBe(40);
  });

  it('nadpłata z poprzedniego roku wchodzi jako kwota ujemna', () => {
    const payments = { Alice: [{ id: 'p1', amount: 70, date: '2026-12-30' }] };
    const data = buildDebtDisplayData(alice, history, payments);
    expect(data.carryOver.amount).toBe(-20);
    expect(data.balance).toBe(20);
  });

  it('dopóki nie ma sesji z nowego roku, nic się nie zwija', () => {
    const onlyOld = history.slice(1);
    expect(buildDebtDisplayData(alice, onlyOld, {}).carryOver).toBeNull();
  });

  it('kilka starszych lat opisuje zakres, nie pojedynczy rok', () => {
    const longer = [
      ...history,
      { id: 'x1', datePlayed: '2025-11-05', sport: 'pingpong', totalCost: 10, costPerPerson: 10, presentPlayers: ['Alice'], multisportPlayers: [] },
    ];
    const carry = buildDebtDisplayData(alice, longer, {}).carryOver;
    expect(carry.fromYear).toBe(2025);
    expect(carry.toYear).toBe(2026);
    expect(carry.amount).toBe(60);
  });
});

// ─── getWrappedSeason ─────────────────────────────────────────────────────────

describe('getWrappedSeason', () => {
  it('w trakcie sezonu nie proponuje niczego', () => {
    expect(getWrappedSeason([2026], null, 2026)).toBeNull();
    expect(getWrappedSeason([2026, 2025], 2026, 2026)).toBeNull();
  });

  it('po przełomie roku sam proponuje miniony sezon, choć filtr jest ukryty', () => {
    expect(getWrappedSeason([2026], null, 2027)).toBe(2026);
  });

  it('pierwsza sesja nowego roku wygasza propozycję', () => {
    expect(getWrappedSeason([2027, 2026], 2027, 2027)).toBeNull();
  });

  it('wybrany starszy sezon niż najnowszy w danych dostaje Wrapped', () => {
    expect(getWrappedSeason([2027, 2026], 2026, 2026)).toBe(2026);
  });

  it('wybrany zakończony sezon wygrywa z propozycją', () => {
    expect(getWrappedSeason([2027, 2026, 2025], 2025, 2027)).toBe(2025);
  });

  it('daje dostęp do ostatniego sezonu także po kilku latach bez sesji', () => {
    expect(getWrappedSeason([2025], null, 2027)).toBe(2025);
    expect(getWrappedSeason([2026, 2025], 2026, 2028)).toBe(2026);
    expect(getWrappedSeason([], null, 2027)).toBeNull();
  });
});

// ─── calculateSeasonPlayerStats ───────────────────────────────────────────────

describe('calculateSeasonPlayerStats na przełomie roku', () => {
  const fullHistory = [
    { id: 'n2', datePlayed: '2027-01-15', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'],        multisportPlayers: [] },
    { id: 'n1', datePlayed: '2027-01-08', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
    { id: 'o2', datePlayed: '2026-12-18', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'],        multisportPlayers: [] },
    { id: 'o1', datePlayed: '2026-12-11', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'],        multisportPlayers: [] },
  ];
  const seasonHistory = fullHistory.filter(s => s.datePlayed.startsWith('2027'));
  const players = [
    { name: 'Alice', attendanceCount: 4, currentDebt: 0, eligibleWeeks: 4, joinDate: null },
    { name: 'Bob',   attendanceCount: 1, currentDebt: 0, eligibleWeeks: 4, joinDate: null },
  ];

  const statsOf = (name, stats) => stats.find(p => p.name === name);

  it('frekwencja liczy się tylko z sezonu', () => {
    const stats = calculateSeasonPlayerStats(players, seasonHistory);
    expect(statsOf('Alice', stats).attendanceCount).toBe(2);
    expect(statsOf('Alice', stats).eligibleWeeks).toBe(2);
    expect(statsOf('Bob', stats).attendancePercentage).toBe(50);
  });

  // Nowy sezon to czysta karta — seria też. Kto grał nieprzerwanie od grudnia,
  // w styczniu ma serię liczoną od pierwszej sesji nowego roku, nie od grudnia.
  it('seria startuje od zera na granicy sezonu', () => {
    const stats = calculateSeasonPlayerStats(players, seasonHistory);
    expect(statsOf('Alice', stats).currentStreak).toBe(2);
    // Dla porównania: w widoku „wszystkie sezony" seria jest ciągła.
    const all = calculatePlayerStats(players, fullHistory, fullHistory.length);
    expect(statsOf('Alice', all).currentStreak).toBe(4);
  });

  it('seria liczy się od najnowszej sesji sezonu', () => {
    const withGap = [
      fullHistory[0], // 2027-01-15 — Alice
      { id: 'n0', datePlayed: '2027-01-01', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Bob'], multisportPlayers: [] },
    ];
    const stats = calculateSeasonPlayerStats(players, withGap);
    expect(statsOf('Alice', stats).currentStreak).toBe(1); // nie była na 2027-01-01
    expect(statsOf('Bob', stats).currentStreak).toBe(0);   // najnowszej sesji nie było
  });

  it('ranking pomija graczy, którzy w sezonie nie zagrali', () => {
    const benchwarmers = [...players, { name: 'Cara', attendanceCount: 0, currentDebt: 0, eligibleWeeks: 4, joinDate: null }];
    const stats = calculateSeasonPlayerStats(benchwarmers, seasonHistory);
    expect(stats.map(p => p.name)).not.toContain('Cara');
  });
});

// ─── calculateSeasonCardStats ─────────────────────────────────────────────────

describe('calculateSeasonCardStats — kafelki na dashboardzie', () => {
  const seasonHistory = [
    { id: 'n2', datePlayed: '2027-01-15', sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice'], multisportPlayers: [] },
    { id: 'n1', datePlayed: '2027-01-08', sport: 'squash',   totalCost: 20, costPerPerson: 20, presentPlayers: ['Alice', 'Bob'], multisportPlayers: [] },
  ];
  const players = [
    { name: 'Alice', attendanceCount: 40, currentDebt: 0, eligibleWeeks: 52, joinDate: null },
    { name: 'Bob',   attendanceCount: 12, currentDebt: 0, eligibleWeeks: 52, joinDate: null },
    // Zawodnik z poprzedniego sezonu, który w 2027 jeszcze nie zagrał.
    { name: 'Cara',  attendanceCount: 9,  currentDebt: 30, eligibleWeeks: 52, joinDate: null },
  ];

  const statsOf = (name, stats) => stats.find(p => p.name === name);

  it('zostawia wszystkich graczy, także bez sesji w sezonie', () => {
    const stats = calculateSeasonCardStats(players, seasonHistory);
    expect(stats).toHaveLength(3);
    const cara = statsOf('Cara', stats);
    expect(cara.attendanceCount).toBe(0);
    expect(cara.attendancePercentage).toBe(0);
    expect(cara.currentStreak).toBe(0);
  });

  it('OVR, obecność i seria biorą się z sezonu, nie z kariery', () => {
    const stats = calculateSeasonCardStats(players, seasonHistory);
    const alice = statsOf('Alice', stats);
    expect(alice.attendanceCount).toBe(2);
    expect(alice.eligibleWeeks).toBe(2);
    expect(alice.attendancePercentage).toBe(100);
    expect(alice.currentStreak).toBe(2);
  });

  it('pusty sezon daje wszystkim zera', () => {
    const stats = calculateSeasonCardStats(players, []);
    expect(stats.every(p => p.attendanceCount === 0 && p.attendancePercentage === 0)).toBe(true);
  });
});

// ─── getCurrentSeason ─────────────────────────────────────────────────────────

describe('getCurrentSeason', () => {
  const session = (id, datePlayed) => ({
    id, datePlayed, sport: 'pingpong', totalCost: 20, costPerPerson: 20, presentPlayers: [], multisportPlayers: [],
  });

  it('bierze najnowszy rok z danych, nie z zegara', () => {
    const history = [session('b', '2027-01-08'), session('a', '2026-12-18')];
    expect(getCurrentSeason(history)).toBe(2027);
  });

  it('bez sesji nie ma sezonu', () => {
    expect(getCurrentSeason([])).toBeNull();
    expect(getCurrentSeason([{ datePlayed: '' }])).toBeNull();
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

