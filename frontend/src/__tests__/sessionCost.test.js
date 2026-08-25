import { getPlayerSessionCost, getSessionBaseCost, getSessionShares } from '../utils/sessionCost';

// Kwota sesji to zawsze tyle, ile organizator zapłacił w recepcji — czyli cena
// kortu POMNIEJSZONA o 15 zł za każdą okazaną kartę Multisport. Rozliczenie
// odtwarza cenę pełną i oddaje rabat temu, kto kartę przyniósł.

const sum = (session) =>
  session.presentPlayers.reduce((acc, p) => acc + getPlayerSessionCost(session, p), 0);

describe('podział kosztów jest wspólny dla wszystkich dyscyplin', () => {
  it.each(['pingpong', 'squash', 'badminton', 'padel'])(
    '%s: posiadacz karty płaci dokładnie 15 zł mniej',
    (sport) => {
      const s = { totalCost: 70, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A'], sport };
      expect(getPlayerSessionCost(s, 'B') - getPlayerSessionCost(s, 'A')).toBe(15);
      expect(sum(s)).toBeCloseTo(70, 2);
    },
  );

  it('brak sportu = ping-pong, ale kwoty i tak wychodzą te same', () => {
    const withSport = { totalCost: 70, presentPlayers: ['A', 'B'], multisportPlayers: ['A'], sport: 'squash' };
    const withoutSport = { totalCost: 70, presentPlayers: ['A', 'B'], multisportPlayers: ['A'] };
    expect(getSessionShares(withoutSport).byPlayer).toEqual(getSessionShares(withSport).byPlayer);
  });
});

describe('ping-pong', () => {
  it('stół 30 zł, 2 karty pokrywają całość — nikt nie dopłaca', () => {
    // W recepcji zostało 0 zł do zapłaty.
    const s = { totalCost: 0, presentPlayers: ['A', 'B'], multisportPlayers: ['A', 'B'], sport: 'pingpong' };
    expect(getPlayerSessionCost(s, 'A')).toBe(0);
    expect(getPlayerSessionCost(s, 'B')).toBe(0);
  });

  it('stół 30 zł, jedna karta — płaci tylko gracz bez karty', () => {
    const s = { totalCost: 15, presentPlayers: ['A', 'B'], multisportPlayers: ['A'], sport: 'pingpong' };
    expect(getPlayerSessionCost(s, 'A')).toBe(0);
    expect(getPlayerSessionCost(s, 'B')).toBe(15);
  });

  it('droższy lokal (41 zł), 2 karty — resztę dzielą po równo', () => {
    // 41 zł kortu − 2 × 15 zł z kart = 11 zł do zapłaty w recepcji.
    const s = { totalCost: 11, presentPlayers: ['A', 'B'], multisportPlayers: ['A', 'B'], sport: 'pingpong' };
    expect(getPlayerSessionCost(s, 'A')).toBe(5.5);
    expect(getPlayerSessionCost(s, 'B')).toBe(5.5);
    expect(sum(s)).toBeCloseTo(11, 2);
  });

  it('droższy lokal (41 zł), jedna karta — posiadacz płaci 15 zł mniej', () => {
    // 41 zł − 15 zł = 26 zł w recepcji; cena pełna to 41/2 = 20,50.
    const s = { totalCost: 26, presentPlayers: ['A', 'B'], multisportPlayers: ['A'], sport: 'pingpong' };
    expect(getPlayerSessionCost(s, 'A')).toBe(5.5);
    expect(getPlayerSessionCost(s, 'B')).toBe(20.5);
    expect(sum(s)).toBeCloseTo(26, 2);
  });

  it('gracz nieobecny nie płaci', () => {
    const s = { totalCost: 60, presentPlayers: ['A', 'B'], multisportPlayers: [], sport: 'pingpong' };
    expect(getPlayerSessionCost(s, 'C')).toBe(0);
  });
});

describe('progi cenowe kortu', () => {
  it('85 zł bez kart = pełna cena na osobę', () => {
    const s = { totalCost: 85, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: [], sport: 'squash' };
    expect(getPlayerSessionCost(s, 'A')).toBe(21.25);
  });

  it('70 zł / 1 karta: suma równa się kwocie zapłaconej', () => {
    const s = { totalCost: 70, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A'], sport: 'squash' };
    // cena pełna = 70 + 15 = 85, 85/4 = 21,25
    expect(getPlayerSessionCost(s, 'A')).toBe(6.25);
    expect(getPlayerSessionCost(s, 'B')).toBe(21.25);
    expect(sum(s)).toBeCloseTo(70, 2);
  });

  it('55 zł / 2 karty: suma równa się kwocie zapłaconej', () => {
    const s = { totalCost: 55, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A', 'B'], sport: 'squash' };
    expect(getPlayerSessionCost(s, 'A')).toBe(6.25);
    expect(getPlayerSessionCost(s, 'C')).toBe(21.25);
    expect(sum(s)).toBeCloseTo(55, 2);
  });

  it('badminton 100 zł / 3 karty — przykład organizatora', () => {
    // Kort 145 zł, trzy karty zbijają rachunek do 100 zł.
    const s = { totalCost: 100, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A', 'B', 'C'], sport: 'badminton' };
    expect(getPlayerSessionCost(s, 'D')).toBe(36.25); // 145/4
    expect(getPlayerSessionCost(s, 'A')).toBe(21.25); // 36,25 − 15
    expect(sum(s)).toBeCloseTo(100, 2);
  });
});

describe('zniżka nie może zejść poniżej zera', () => {
  it('tani kort, jedna karta', () => {
    const s = { totalCost: 20, presentPlayers: ['A', 'B'], multisportPlayers: ['B'], sport: 'squash' };
    // cena pełna = 35, 35/2 = 17,50 → 17,50 − 15 = 2,50
    expect(getPlayerSessionCost(s, 'B')).toBe(2.5);
    expect(sum(s)).toBeCloseTo(20, 2);
  });

  it('zniżka większa niż udział — nikt nie płaci na minus, kwota się zgadza', () => {
    const s = { totalCost: 10, presentPlayers: ['A', 'B', 'C'], multisportPlayers: ['A', 'B', 'C'], sport: 'padel' };
    for (const p of s.presentPlayers) expect(getPlayerSessionCost(s, p)).toBeGreaterThanOrEqual(0);
    expect(sum(s)).toBeCloseTo(10, 2);
  });
});

describe('rakiety', () => {
  it('dzielone tylko między wypożyczających, poza zniżką Multisport', () => {
    const s = {
      totalCost: 90, racketCost: 10, sport: 'padel',
      presentPlayers: ['A', 'B'], multisportPlayers: ['A'], ownRacketPlayers: ['A'],
    };
    // kort = 80, cena pełna = (80 + 15)/2 = 47,50
    expect(getPlayerSessionCost(s, 'A')).toBe(32.5);  // 47,50 − 15, bez rakiety
    expect(getPlayerSessionCost(s, 'B')).toBe(57.5);  // 47,50 + 10 za rakietę
    expect(sum(s)).toBeCloseTo(90, 2);
  });

  it('gdy wszyscy mają własne rakiety, ich koszt zostaje nierozdzielony', () => {
    const s = {
      totalCost: 90, racketCost: 10, sport: 'squash',
      presentPlayers: ['A', 'B'], multisportPlayers: [], ownRacketPlayers: ['A', 'B'],
    };
    expect(getSessionShares(s).unallocated).toBe(10);
  });
});

describe('zaszłość po dogrywce', () => {
  it('overtimeCost dolicza się do kwoty sesji, nic nie znika z sald', () => {
    const s = { cost: 45, overtimeCost: 15, present: ['A', 'B', 'C'], multiPlayers: [], sport: 'pingpong' };
    const shares = getSessionShares(s);
    const total = Object.values(shares.byPlayer).reduce((acc, p) => acc + p.total, 0);
    expect(total + shares.unallocated).toBeCloseTo(60, 2);
    expect(shares.byPlayer.A.total).toBe(20);
  });
});

describe('getSessionBaseCost', () => {
  it('zwraca cenę pełną — tę bez zniżki Multisport', () => {
    const s = { totalCost: 85, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A'], sport: 'squash' };
    expect(getSessionBaseCost(s)).toBe(25); // (85 + 15)/4
  });

  it('bez graczy zwraca 0', () => {
    expect(getSessionBaseCost({ totalCost: 85, presentPlayers: [], multisportPlayers: [] })).toBe(0);
  });
});
