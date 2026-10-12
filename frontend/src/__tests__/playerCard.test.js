import { describe, it, expect } from 'vitest';
import { overallRating, rarityOf, playerSportMix, buildPlayerCardMeta } from '../utils/playerCard';
import { getRank } from '../constants';

describe('overallRating', () => {
  it('nowy gracz ląduje na podłodze 40', () => {
    expect(overallRating(0, 0, 0)).toBe(40);
  });

  it('nie wychodzi poza 99', () => {
    expect(overallRating(100, 50, 200)).toBe(99);
  });

  it('rośnie z frekwencją, serią i stażem', () => {
    const low = overallRating(40, 0, 2);
    const high = overallRating(90, 8, 40);
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(80);
  });

  it('ujemne wejścia nie schodzą poniżej 40', () => {
    expect(overallRating(-10, -3, -8)).toBe(40);
  });
});

describe('rarityOf', () => {
  it('mapuje rangi na rzadkość karty', () => {
    expect(rarityOf(getRank(95))).toBe('legend');
    expect(rarityOf(getRank(80))).toBe('elite');
    expect(rarityOf(getRank(65))).toBe('epic');
    expect(rarityOf(getRank(50))).toBe('rare');
    expect(rarityOf(getRank(25))).toBe('common');
    expect(rarityOf(getRank(0))).toBe('ghost');
  });
});

describe('playerSportMix', () => {
  const history = [
    { id: '1', datePlayed: '2026-03-01', sport: 'pingpong', totalCost: 60, costPerPerson: 20, costPerPersonMulti: 5, presentPlayers: ['Ala', 'Bob'], multisportPlayers: [] },
    { id: '2', datePlayed: '2026-03-08', sport: 'squash', totalCost: 80, costPerPerson: 40, costPerPersonMulti: 25, presentPlayers: ['Ala'], multisportPlayers: [] },
    { id: '3', datePlayed: '2026-03-15', sport: 'pingpong', totalCost: 60, costPerPerson: 30, costPerPersonMulti: 15, presentPlayers: ['Bob'], multisportPlayers: [] },
  ];

  it('liczy tylko sesje, na których gracz był', () => {
    expect(playerSportMix('Ala', history)).toEqual([
      { sport: 'pingpong', count: 1 },
      { sport: 'squash', count: 1 },
    ]);
    expect(playerSportMix('Bob', history)).toEqual([
      { sport: 'pingpong', count: 2 },
    ]);
  });

  it('pusta historia daje pustą listę', () => {
    expect(playerSportMix('Ala', [])).toEqual([]);
  });
});

describe('buildPlayerCardMeta', () => {
  it('składa overall, rangę i osiągnięcia z dorobku', () => {
    const player = {
      name: 'Ala',
      attendanceCount: 12,
      currentDebt: 0,
      eligibleWeeks: 12,
      joinDate: null,
      attendancePercentage: 100,
      currentStreak: 5,
    };
    const history = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      datePlayed: `2026-01-${String(i + 1).padStart(2, '0')}`,
      sport: 'pingpong',
      totalCost: 30,
      costPerPerson: 30,
      costPerPersonMulti: 15,
      presentPlayers: ['Ala'],
      multisportPlayers: [],
    }));
    const meta = buildPlayerCardMeta(player, history);
    expect(meta.rarity).toBe('legend');
    expect(meta.rank.name).toBe('LEGENDA');
    expect(meta.overall).toBeGreaterThanOrEqual(90);
    expect(meta.currentStreak).toBe(5);
    expect(meta.sports[0].sport).toBe('pingpong');
    expect(meta.topAchievements.some(a => a.id === 'first_session')).toBe(true);
    expect(meta.topAchievements.length).toBeLessThanOrEqual(4);
  });
});

describe('buildPlayerCardMeta — zakres sezonu', () => {
  const session = (id, datePlayed, sport) => ({
    id, datePlayed, sport,
    totalCost: 30, costPerPerson: 30, costPerPersonMulti: 15,
    presentPlayers: ['Ala'],
    multisportPlayers: [],
  });

  const careerHistory = [
    session('s4', '2027-01-05', 'squash'),
    session('s3', '2026-03-15', 'pingpong'),
    session('s2', '2026-03-08', 'pingpong'),
    session('s1', '2026-03-01', 'pingpong'),
  ];
  const seasonHistory = careerHistory.filter(s => s.datePlayed.startsWith('2027'));

  // Ten sam gracz, dwa zakresy: sezon 2027 i cała kariera.
  const seasonPlayer = {
    name: 'Ala', currentDebt: 0, joinDate: null,
    attendanceCount: 1, eligibleWeeks: 1, attendancePercentage: 100, currentStreak: 1,
  };
  const careerPlayer = {
    ...seasonPlayer,
    attendanceCount: 4, eligibleWeeks: 4, currentStreak: 4,
  };

  it('kafel z sezonu nie dziedziczy sportów i odznak z poprzednich lat', () => {
    const meta = buildPlayerCardMeta(seasonPlayer, seasonHistory);
    expect(meta.attendanceCount).toBe(1);
    expect(meta.eligibleWeeks).toBe(1);
    expect(meta.sports).toEqual([{ sport: 'squash', count: 1 }]);
    expect(meta.topAchievements.map(a => a.id)).toEqual(['first_session']);
  });

  it('OVR z sezonu jest niższy niż z kariery (seria i staż startują od zera)', () => {
    const season = buildPlayerCardMeta(seasonPlayer, seasonHistory);
    const career = buildPlayerCardMeta(careerPlayer, careerHistory);
    expect(season.overall).toBe(89);   // 40 + 100% × 0,48 + 1 × 0,6 + 1 × 0,2
    expect(career.overall).toBe(91);   // 40 + 48 + 4 × 0,6 + 4 × 0,2
    expect(season.overall).toBeLessThan(career.overall);
  });

  it('kafel z kariery dalej pokazuje wszystkie sporty i odznaki', () => {
    const meta = buildPlayerCardMeta(careerPlayer, careerHistory);
    // Kolejność sportów jest stała (ping-pong, squash, badminton, padel),
    // nie zależy od tego, czym grano najczęściej.
    expect(meta.sports).toEqual([
      { sport: 'pingpong', count: 3 },
      { sport: 'squash', count: 1 },
    ]);
    expect(meta.topAchievements.map(a => a.id)).toContain('first_session');
  });
});
