import { getPlayerSessionCost, getSessionShares, getShareGroups, getCourtAmount, getTotalWithRackets, getRacketSelection, inferRacketPricing } from '../utils/sessionCost';

// Kwota sesji to zawsze tyle, ile organizator zapłacił w recepcji — czyli cena
// kortu POMNIEJSZONA o 15 zł za każdą okazaną kartę Multisport. Rozliczenie
// odtwarza cenę pełną i oddaje rabat temu, kto kartę przyniósł.

const sum = (session) =>
  session.presentPlayers.reduce((acc, p) => acc + getPlayerSessionCost(session, p), 0);

describe('kwota kortu i kwota zapisanej sesji', () => {
  it('z zapisanej kwoty zdejmuje rakiety', () => {
    expect(getCourtAmount(80, 10)).toBe(70);
    expect(getCourtAmount(70)).toBe(70);
  });

  it('do kwoty kortu dolicza rakiety', () => {
    expect(getTotalWithRackets(70, 10)).toBe(80);
    expect(getTotalWithRackets(70)).toBe(70);
  });

  it('nie schodzi poniżej zera i nie liczy groszy na floatach', () => {
    expect(getCourtAmount(5, 10)).toBe(0);
    expect(getCourtAmount(0.1 + 0.2, 0.1)).toBe(0.2);
    expect(getTotalWithRackets(0.1 + 0.2, 0.1)).toBe(0.4);
  });

  it('edycja bez zmian odtwarza dokładnie tę samą kwotę sesji', () => {
    const storedTotal = getTotalWithRackets(70, 10); // dodawanie: kort + rakiety
    const editPrefill = getCourtAmount(storedTotal, 10); // edycja pyta o kort
    expect(editPrefill).toBe(70);
    expect(getTotalWithRackets(editPrefill, 10)).toBe(storedTotal);
  });
});

describe('getRacketSelection — wspólna logika wypożyczenia', () => {
  it('przycina liczbę rakiet do graczy bez własnej rakietki', () => {
    const selection = getRacketSelection('squash', ['A', 'B', 'C', 'D'], ['A'], 9, 5);
    expect(selection).toMatchObject({
      withRackets: true,
      ownRacketPresentCount: 1,
      maxRackets: 3,
      effectiveCount: 3,
      price: 5,
      cost: 15,
    });
  });

  it('pozwala wypożyczyć rakietę każdemu obecnemu graczowi', () => {
    const selection = getRacketSelection('squash', ['A', 'B', 'C', 'D', 'E', 'F'], [], 6, 5);
    expect(selection).toMatchObject({ maxRackets: 6, effectiveCount: 6, price: 5, cost: 30 });
  });

  it('nie ucina liczby rakiet przy większej grupie', () => {
    const names = Array.from({ length: 12 }, (_, i) => `P${i}`);
    const selection = getRacketSelection('padel', names, [], 12, 5);
    expect(selection).toMatchObject({ maxRackets: 12, effectiveCount: 12, cost: 60 });
  });

  it('dla sportu bez wypożyczalni zeruje rakiety', () => {
    const selection = getRacketSelection('pingpong', ['A', 'B'], [], 3, 5);
    expect(selection).toMatchObject({ withRackets: false, maxRackets: 0, effectiveCount: 0, cost: 0 });
  });

  it('nie gubi groszy przy cenie ułamkowej', () => {
    expect(getRacketSelection('badminton', ['A', 'B'], [], 2, 2.5).cost).toBe(5);
  });
});

describe('inferRacketPricing — odtworzenie ceny z zapisanego kosztu', () => {
  it('dzieli typowy koszt przez domyślną cenę', () => {
    expect(inferRacketPricing(10, 4)).toEqual({ racketCount: 2, racketPrice: 5 });
    expect(inferRacketPricing(15, 4)).toEqual({ racketCount: 3, racketPrice: 5 });
  });

  it('szuka innego podziału, gdy domyślna cena nie wychodzi co do grosza', () => {
    expect(inferRacketPricing(12.5, 4)).toEqual({ racketCount: 2, racketPrice: 6.25 });
    expect(inferRacketPricing(25, 4)).toEqual({ racketCount: 4, racketPrice: 6.25 });
  });

  it('nie przekracza liczby graczy bez własnej rakietki', () => {
    expect(inferRacketPricing(17.5, 4)).toEqual({ racketCount: 2, racketPrice: 8.75 });
    expect(inferRacketPricing(30, 4)).toEqual({ racketCount: 4, racketPrice: 7.5 });
  });

  it('odtwarza więcej niż 4 rakiety', () => {
    expect(inferRacketPricing(30, 6)).toEqual({ racketCount: 6, racketPrice: 5 });
    expect(inferRacketPricing(48, 6)).toEqual({ racketCount: 6, racketPrice: 8 });
  });

  it('zero rakiet zachowuje domyślną cenę', () => {
    expect(inferRacketPricing(0, 4)).toEqual({ racketCount: 0, racketPrice: 5 });
    expect(inferRacketPricing(undefined, 4)).toEqual({ racketCount: 0, racketPrice: 5 });
  });

  it('edycja bez zmian odtwarza zapisany koszt rakiet', () => {
    for (const cost of [5, 10, 12.5, 15, 17.5, 25, 30, 48]) {
      const { racketCount, racketPrice } = inferRacketPricing(cost, 6);
      const selection = getRacketSelection(
        'squash',
        ['A', 'B', 'C', 'D', 'E', 'F'],
        [],
        racketCount,
        racketPrice,
      );
      expect(selection.cost).toBe(cost);
    }
  });
});

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

describe('stawki poglądowe pokrywają się z tym, co gracze faktycznie płacą', () => {
  it('baseCourt i baseCourtMulti to realne udziały, nie osobny wzór', () => {
    const s = { totalCost: 85, presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A'], sport: 'squash' };
    const shares = getSessionShares(s);
    expect(shares.baseCourt).toBe(getPlayerSessionCost(s, 'B'));
    expect(shares.baseCourtMulti).toBe(getPlayerSessionCost(s, 'A'));
    expect(shares.discountCapped).toBe(false);
  });

  it('bez graczy zwraca zera', () => {
    const shares = getSessionShares({ totalCost: 85, presentPlayers: [], multisportPlayers: [] });
    expect(shares.baseCourt).toBe(0);
    expect(shares.baseCourtMulti).toBe(0);
  });

  it('gdy wszyscy mają kartę, stawka „bez karty" pokazuje realnie płaconą kwotę', () => {
    const s = { totalCost: 11, presentPlayers: ['A', 'B'], multisportPlayers: ['A', 'B'], sport: 'pingpong' };
    const shares = getSessionShares(s);
    expect(shares.baseCourt).toBe(5.5);
    expect(shares.baseCourtMulti).toBe(5.5);
  });

  // Regresja: podgląd pokazywał 7,67 zł od trzech osób bez karty (razem 23 zł),
  // choć w recepcji zostawiono 1 zł. Stawki muszą sumować się do kwoty sesji.
  it('zniżki większe niż rachunek: stawki nadal sumują się do zapłaconej kwoty', () => {
    const s = {
      totalCost: 1, sport: 'pingpong',
      presentPlayers: ['Rafał', 'Kamil', 'Przemek', 'Mariusz', 'Arek', 'Krzysiek'],
      multisportPlayers: ['Rafał', 'Kamil', 'Krzysiek'],
    };
    const shares = getSessionShares(s);

    expect(shares.discountCapped).toBe(true);
    expect(shares.baseCourtMulti).toBe(0);
    expect(shares.baseCourt).toBeLessThan(1);
    expect(sum(s)).toBeCloseTo(1, 2);

    const groups = getShareGroups(s);
    const collected = groups.reduce((acc, g) => acc + g.perPerson * g.names.length, 0);
    expect(collected).toBeCloseTo(1, 2);
  });
});

describe('getShareGroups', () => {
  it('grupuje po karcie i rakietce, a stawki bierze z podziału sesji', () => {
    const s = {
      totalCost: 90, racketCost: 10, sport: 'padel',
      presentPlayers: ['A', 'B'], multisportPlayers: ['A'], ownRacketPlayers: ['A'],
    };
    expect(getShareGroups(s)).toEqual([
      { names: ['B'], hasCard: false, ownRacket: false, perPerson: 57.5 },
      { names: ['A'], hasCard: true, ownRacket: true, perPerson: 32.5 },
    ]);
  });

  it('bez kosztu rakiet nie rozbija graczy na dwie identyczne stawki', () => {
    const s = {
      totalCost: 60, sport: 'squash',
      presentPlayers: ['A', 'B', 'C'], multisportPlayers: [], ownRacketPlayers: ['A'],
    };
    expect(getShareGroups(s)).toEqual([
      { names: ['A', 'B', 'C'], hasCard: false, ownRacket: false, perPerson: 20 },
    ]);
  });

  it('każda grupa razy liczba osób daje kwotę sesji', () => {
    const s = {
      totalCost: 100, racketCost: 16, sport: 'badminton',
      presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A', 'B'], ownRacketPlayers: ['A', 'C'],
    };
    const collected = getShareGroups(s).reduce((acc, g) => acc + g.perPerson * g.names.length, 0);
    expect(collected).toBeCloseTo(100, 2);
  });
});

describe('limit kart MultiSport', () => {
  // Domyślne limity: pingpong/squash = 2, badminton/padel = 4 (na kort/godzinę).

  it('bez courtCount/durationHours brak limitów (backward compatible)', () => {
    // Stare sesje bez courtCount/durationHours nie mają limitów.
    const s = { totalCost: 100, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A', 'B', 'C'] };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(false);
    expect(shares.maxMulti).toBe(Infinity);
    expect(shares.effectiveCards).toBe(3);
    // Pełna zniżka 15 zł na kartę.
    expect(getPlayerSessionCost(s, 'A')).toBe(getPlayerSessionCost(s, 'D') - 15);
  });

  it('stare sesje bez limitów nie obcinają kart nawet przy >4 kartach', () => {
    // 5 graczy z kartą w badmintonie, bez courtCount/durationHours:
    // stara sesja — każda karta dostaje pełne 15 zł zniżki, brak proporcjonalnego dzielenia.
    const s = { totalCost: 70, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'] };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(false);
    expect(shares.maxMulti).toBe(Infinity);
    expect(shares.effectiveCards).toBe(5);
    // Koszt pełny = 70 + 5*15 = 145 zł. Na osobę = 29 zł. Z kartą: 29 - 15 = 14 zł.
    expect(getPlayerSessionCost(s, 'A')).toBe(14);
    expect(getPlayerSessionCost(s, 'E')).toBe(14);
  });

  it('z courtCount/durationHours limity działają', () => {
    // Nowe sesje z courtCount/durationHours mają limity.
    const s = { totalCost: 100, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A', 'B', 'C'], courtCount: 1, durationHours: 1 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(false);
    expect(shares.maxMulti).toBe(4);
    expect(shares.effectiveCards).toBe(3);
    // Pełna zniżka 15 zł na kartę (3 mieści się w limicie 4).
    expect(getPlayerSessionCost(s, 'A')).toBe(getPlayerSessionCost(s, 'D') - 15);
  });

  it('przekroczenie limitu — zniżka proporcjonalnie podzielona', () => {
    // Badminton 1 kort × 1 godzina = limit 4 karty. 5 graczy z kartą.
    // Zapłacono: 145 − 4×15 = 85 zł (bo tylko 4 karty zadziałały).
    const s = { totalCost: 85, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'], courtCount: 1, durationHours: 1 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(true);
    expect(shares.maxMulti).toBe(4);
    expect(shares.effectiveCards).toBe(4);
    // Każda karta dostaje 4/5 × 15 = 12 zł zniżki.
    // Base = (85 + 4×15) / 5 = 145/5 = 29 zł.
    // Każdy z kartą płaci: 29 − 12 = 17 zł.
    expect(getPlayerSessionCost(s, 'A')).toBe(17);
    expect(getPlayerSessionCost(s, 'E')).toBe(17);
    expect(sum(s)).toBeCloseTo(85, 2);
  });

  it('przekroczenie limitu z graczami bez karty', () => {
    // Badminton 1 kort × 1 godzina = limit 4. 5 z kartą + 1 bez = 6 graczy.
    // Zapłacono: 174 − 4×15 = 114 zł.
    const s = { totalCost: 114, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E', 'F'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'], courtCount: 1, durationHours: 1 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(true);
    expect(shares.effectiveCards).toBe(4);
    // Base = (114 + 60) / 6 = 174/6 = 29 zł.
    // Zniżka per karta: 60/5 = 12 zł.
    // Z kartą: 29 − 12 = 17 zł.
    // Bez karty: 29 zł.
    expect(getPlayerSessionCost(s, 'A')).toBe(17);
    expect(getPlayerSessionCost(s, 'F')).toBe(29);
    expect(sum(s)).toBeCloseTo(114, 2);
  });

  it('2 godziny podwajają limit', () => {
    // Badminton 1 kort × 2 godziny = limit 8 kart.
    const s = { totalCost: 100, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'], courtCount: 1, durationHours: 2 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(false);
    expect(shares.maxMulti).toBe(8);
    expect(shares.effectiveCards).toBe(5);
    // Wszystkie 5 kart mieści się w limicie — pełna zniżka 15 zł.
    expect(getPlayerSessionCost(s, 'A')).toBe(getPlayerSessionCost(s, 'E'));
  });

  it('2 korty × 2 godziny = limit 16 dla badmintona', () => {
    const s = { totalCost: 200, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E', 'F'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'], courtCount: 2, durationHours: 2 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(false);
    expect(shares.maxMulti).toBe(16);
  });

  it('squash ma limit 2 karty/kort/godzinę', () => {
    // Squash 1 kort × 1 godzina = limit 2. 3 graczy z kartą.
    const s = { totalCost: 60, sport: 'squash', presentPlayers: ['A', 'B', 'C'], multisportPlayers: ['A', 'B', 'C'], courtCount: 1, durationHours: 1 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(true);
    expect(shares.maxMulti).toBe(2);
    expect(shares.effectiveCards).toBe(2);
    // Base = (60 + 2×15) / 3 = 90/3 = 30 zł.
    // Zniżka per karta: 30/3 = 10 zł.
    // Każdy z kartą: 30 − 10 = 20 zł.
    expect(getPlayerSessionCost(s, 'A')).toBe(20);
    expect(sum(s)).toBeCloseTo(60, 2);
  });

  it('pingpong ma limit 2 karty/stół/godzinę', () => {
    const s = { totalCost: 20, sport: 'pingpong', presentPlayers: ['A', 'B', 'C', 'D'], multisportPlayers: ['A', 'B', 'C'], courtCount: 1, durationHours: 1 };
    const shares = getSessionShares(s);
    expect(shares.multiCapped).toBe(true);
    expect(shares.maxMulti).toBe(2);
    expect(shares.effectiveCards).toBe(2);
  });

  it('suma udziałów zawsze równa kwocie sesji przy przekroczonym limicie', () => {
    // Różne kombinacje — suma musi się zgadzać co do grosza.
    const cases = [
      { totalCost: 85, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'], courtCount: 1, durationHours: 1 },
      { totalCost: 114, sport: 'badminton', presentPlayers: ['A', 'B', 'C', 'D', 'E', 'F'], multisportPlayers: ['A', 'B', 'C', 'D', 'E'], courtCount: 1, durationHours: 1 },
      { totalCost: 60, sport: 'squash', presentPlayers: ['A', 'B', 'C'], multisportPlayers: ['A', 'B', 'C'], courtCount: 1, durationHours: 1 },
      { totalCost: 33, sport: 'pingpong', presentPlayers: ['A', 'B', 'C', 'D', 'E'], multisportPlayers: ['A', 'B', 'C', 'D'], courtCount: 1, durationHours: 1 },
    ];
    for (const s of cases) {
      expect(sum(s)).toBeCloseTo(s.totalCost, 2);
    }
  });
});
