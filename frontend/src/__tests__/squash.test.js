import { getPlayerSessionCost, getSessionBaseCost } from '../utils/sessionCost';

describe('getPlayerSessionCost', () => {
  const pingSession = {
    totalCost: 60,
    presentPlayers: ['Alice', 'Bob', 'Charlie'],
    multisportPlayers: ['Charlie'],
    sport: 'pingpong',
  };

  const squashSession = {
    totalCost: 85,
    presentPlayers: ['Alice', 'Bob', 'Charlie', 'Dave'],
    multisportPlayers: ['Bob'],
    sport: 'squash',
  };

  describe('ping-pong', () => {
    it('non-multisport player pays share among payers', () => {
      // 60 / 2 payers (Alice, Bob) = 30
      expect(getPlayerSessionCost(pingSession, 'Alice')).toBe(30);
    });

    it('multisport player pays 0', () => {
      expect(getPlayerSessionCost(pingSession, 'Charlie')).toBe(0);
    });

    it('absent player pays 0', () => {
      expect(getPlayerSessionCost(pingSession, 'Dave')).toBe(0);
    });
  });

  describe('squash', () => {
    it('non-multisport player pays hypothetical base share', () => {
      // hypothetical = 85 + 1*15 = 100, 100/4 = 25
      expect(getPlayerSessionCost(squashSession, 'Alice')).toBe(25);
    });

    it('multisport player pays base minus 15 discount', () => {
      // hypothetical = 100, 100/4 = 25, 25 - 15 = 10
      expect(getPlayerSessionCost(squashSession, 'Bob')).toBe(10);
    });

    it('absent player pays 0', () => {
      expect(getPlayerSessionCost(squashSession, 'Eve')).toBe(0);
    });

    it('discount does not go below 0', () => {
      const cheapSession = {
        totalCost: 20,
        presentPlayers: ['Alice', 'Bob'],
        multisportPlayers: ['Bob'],
        sport: 'squash',
      };
      // hypothetical = 20 + 15 = 35, 35/2 = 17.5, 17.5 - 15 = 2.5
      expect(getPlayerSessionCost(cheapSession, 'Bob')).toBe(2.5);
    });

    it('sum always equals actual cost', () => {
      // 3 × 25 + 1 × 10 = 85 ✅
      const players = squashSession.presentPlayers;
      const total = players.reduce((s, p) => s + getPlayerSessionCost(squashSession, p), 0);
      expect(total).toBeCloseTo(squashSession.totalCost, 2);
    });
  });

  describe('squash pricing tiers', () => {
    it('85 zł / 0 cards = full price per person', () => {
      const s = { totalCost: 85, presentPlayers: ['A','B','C','D'], multisportPlayers: [], sport: 'squash' };
      // hypothetical = 85 + 0 = 85, 85/4 = 21.25
      expect(getPlayerSessionCost(s, 'A')).toBe(21.25);
    });

    it('70 zł / 1 card: sum equals actual cost', () => {
      const s = { totalCost: 70, presentPlayers: ['A','B','C','D'], multisportPlayers: ['A'], sport: 'squash' };
      // hypothetical = 70 + 15 = 85, 85/4 = 21.25
      expect(getPlayerSessionCost(s, 'A')).toBe(6.25);  // 21.25 - 15
      expect(getPlayerSessionCost(s, 'B')).toBe(21.25);
      // 6.25 + 3 × 21.25 = 70 ✅
      const total = s.presentPlayers.reduce((sum, p) => sum + getPlayerSessionCost(s, p), 0);
      expect(total).toBeCloseTo(70, 2);
    });

    it('55 zł / 2 cards: sum equals actual cost', () => {
      const s = { totalCost: 55, presentPlayers: ['A','B','C','D'], multisportPlayers: ['A','B'], sport: 'squash' };
      // hypothetical = 55 + 30 = 85, 85/4 = 21.25
      expect(getPlayerSessionCost(s, 'A')).toBe(6.25);  // 21.25 - 15
      expect(getPlayerSessionCost(s, 'C')).toBe(21.25);
      // 2 × 6.25 + 2 × 21.25 = 55 ✅
      const total = s.presentPlayers.reduce((sum, p) => sum + getPlayerSessionCost(s, p), 0);
      expect(total).toBeCloseTo(55, 2);
    });

    it('corner case: 2 players, 2 multisport, cost 55', () => {
      const s = { totalCost: 55, presentPlayers: ['A','B'], multisportPlayers: ['A','B'], sport: 'squash' };
      // hypothetical = 55 + 30 = 85, 85/2 = 42.5, 42.5 - 15 = 27.5
      expect(getPlayerSessionCost(s, 'A')).toBe(27.5);
      expect(getPlayerSessionCost(s, 'B')).toBe(27.5);
      // 27.5 + 27.5 = 55 ✅
      const total = s.presentPlayers.reduce((sum, p) => sum + getPlayerSessionCost(s, p), 0);
      expect(total).toBeCloseTo(55, 2);
    });
  });
});

describe('getSessionBaseCost', () => {
  it('ping-pong: base cost is split among paying players', () => {
    const s = { totalCost: 60, presentPlayers: ['A','B','C'], multisportPlayers: ['C'], sport: 'pingpong' };
    expect(getSessionBaseCost(s)).toBe(30);
  });

  it('squash: base cost uses hypothetical full price', () => {
    const s = { totalCost: 85, presentPlayers: ['A','B','C','D'], multisportPlayers: ['A'], sport: 'squash' };
    // hypothetical = 85 + 15 = 100, 100/4 = 25
    expect(getSessionBaseCost(s)).toBe(25);
  });

  it('no players returns 0', () => {
    const s = { totalCost: 85, presentPlayers: [], multisportPlayers: [], sport: 'squash' };
    expect(getSessionBaseCost(s)).toBe(0);
  });

  it('defaults to pingpong when sport is missing', () => {
    const s = { totalCost: 60, presentPlayers: ['A','B','C'], multisportPlayers: ['C'] };
    expect(getSessionBaseCost(s)).toBe(30);
  });
});
