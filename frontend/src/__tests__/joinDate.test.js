import { describe, it, expect } from 'vitest';
import { filterHistorySinceJoin } from '../utils/playerHistory';
import { calculatePlayerStats, calculateSeasonPlayerStats, computeRankingHistory } from '../utils/rankings';
import { computeWrappedStats } from '../utils/wrapped';
import { getPlayerAchievements } from '../utils/achievements';

const session = (id, datePlayed, presentPlayers) => ({
  id,
  datePlayed,
  sport: 'pingpong',
  totalCost: 20,
  costPerPerson: 20,
  costPerPersonMulti: 15,
  presentPlayers,
  multisportPlayers: [],
});

describe('filterHistorySinceJoin — wspólny zakres sesji gracza', () => {
  const history = [
    session('s4', '2025-02-10', ['A']),
    session('s3', '2025-02-01', ['A']),
    session('s2', '2025-01-31', ['A']),
    session('s1', '2025-01-10', ['A']),
  ];

  it('zostawia sesję z dnia dołączenia i późniejsze', () => {
    expect(filterHistorySinceJoin(history, '2025-02-01').map(s => s.id)).toEqual(['s4', 's3']);
  });

  it('bez daty dołączenia zwraca całą historię', () => {
    expect(filterHistorySinceJoin(history, null)).toEqual(history);
    expect(filterHistorySinceJoin(history, undefined)).toEqual(history);
  });
});

describe('joinDate w rankingu — własny mianownik od dołączenia', () => {
  const players = [
    { name: 'Alice', attendanceCount: 4, currentDebt: 0, eligibleWeeks: 4, joinDate: null },
    { name: 'Bob', attendanceCount: 2, currentDebt: 0, eligibleWeeks: 2, joinDate: '2025-02-01' },
  ];

  const history = [
    session('f2', '2025-02-10', ['Alice', 'Bob']),
    session('f1', '2025-02-03', ['Alice', 'Bob']),
    session('j2', '2025-01-20', ['Alice']),
    session('j1', '2025-01-10', ['Alice']),
  ];

  it('nie pokazuje gracza przed jego pierwszą sesją', () => {
    const january = computeRankingHistory(players, history).find(d => d.month === '2025-01');
    expect(january.rankings.map(r => r.name)).toEqual(['Alice']);
  });

  it('procent liczy tylko sesje od dołączenia, nie całą historię', () => {
    const february = computeRankingHistory(players, history).find(d => d.month === '2025-02');
    const bob = february.rankings.find(r => r.name === 'Bob');
    expect(bob).toMatchObject({ pct: 100, attended: 2, place: 1 });
  });
});

describe('joinDate w statystykach sezonu i serii', () => {
  const players = [
    { name: 'Alice', attendanceCount: 6, currentDebt: 0, eligibleWeeks: 6, joinDate: null },
    { name: 'Bob', attendanceCount: 3, currentDebt: 0, eligibleWeeks: 3, joinDate: '2025-02-01' },
  ];

  // Bob dołączył 1 lutego; styczniowe sesje nie są jego nieobecnościami.
  const seasonHistory = [
    session('f3', '2025-02-24', ['Alice', 'Bob']),
    session('f2', '2025-02-17', ['Alice', 'Bob']),
    session('f1', '2025-02-10', ['Alice', 'Bob']),
    session('j3', '2025-01-20', ['Alice']),
    session('j2', '2025-01-13', ['Alice']),
    session('j1', '2025-01-06', ['Alice']),
  ];

  it('frekwencja Boba to 3/3, a nie 3/6', () => {
    const bob = calculateSeasonPlayerStats(players, seasonHistory).find(p => p.name === 'Bob');
    expect(bob).toMatchObject({ attendanceCount: 3, eligibleWeeks: 3, attendancePercentage: 100 });
  });

  it('seria nie łapie sesji sprzed dołączenia', () => {
    const bob = calculatePlayerStats(
      [{ ...players[1], attendanceCount: 1, eligibleWeeks: 1 }],
      [session('f1', '2025-02-10', ['Bob']), session('pre', '2025-01-10', ['Bob'])],
      2,
    )[0];
    expect(bob.currentStreak).toBe(1);
  });
});

describe('joinDate we Wrapped — nieobecności tylko od dołączenia', () => {
  const players = [
    { name: 'Alice', attendanceCount: 6, currentDebt: 0, eligibleWeeks: 6, joinDate: null },
    { name: 'Bob', attendanceCount: 3, currentDebt: 0, eligibleWeeks: 3, joinDate: '2025-02-01' },
  ];

  const history = [
    session('f3', '2025-02-24', ['Alice', 'Bob']),
    session('f2', '2025-02-17', ['Alice', 'Bob']),
    session('f1', '2025-02-10', ['Alice', 'Bob']),
    session('j3', '2025-01-20', ['Alice']),
    session('j2', '2025-01-13', ['Alice']),
    session('j1', '2025-01-06', ['Alice']),
  ];

  it('Bob ma 3/3 i zero opuszczonych, mimo styczniowych sesji', () => {
    const stats = computeWrappedStats(history, players, 2025);
    const bob = stats.players.find(p => p.name === 'Bob');
    expect(bob).toMatchObject({ attended: 3, missed: 0, percentage: 100, longestStreak: 3 });
  });

  it('Alice nadal ma pełny rok', () => {
    const stats = computeWrappedStats(history, players, 2025);
    const alice = stats.players.find(p => p.name === 'Alice');
    expect(alice).toMatchObject({ attended: 6, missed: 0, percentage: 100 });
  });
});

describe('joinDate w odznakach', () => {
  it('sesje sprzed dołączenia nie blokują Perfekcyjnego miesiąca', () => {
    const player = {
      name: 'A', attendanceCount: 3, currentDebt: 0, eligibleWeeks: 3,
      joinDate: '2025-02-10', currentStreak: 3,
    };
    // W lutym przed dołączeniem były dwie sesje bez A; po dołączeniu — trzy z A.
    const history = [
      session('f3', '2025-02-26', ['A']),
      session('f2', '2025-02-19', ['A']),
      session('f1', '2025-02-12', ['A']),
      session('p2', '2025-02-05', ['B']),
      session('p1', '2025-02-01', ['B']),
    ];
    const ids = getPlayerAchievements(player, history).map(a => a.id);
    expect(ids).toContain('perfect_month');
  });

  it('obecność sprzed dołączenia nie daje Debiutu', () => {
    const player = {
      name: 'A', attendanceCount: 0, currentDebt: 0, eligibleWeeks: 0,
      joinDate: '2025-02-01', currentStreak: 0,
    };
    const history = [session('pre', '2025-01-10', ['A'])];
    expect(getPlayerAchievements(player, history).map(a => a.id)).not.toContain('first_session');
  });
});
