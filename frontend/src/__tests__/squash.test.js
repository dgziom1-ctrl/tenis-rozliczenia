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
    it('non-multisport player pays equal share', () => {
      // 85 / 4 = 21.25
      expect(getPlayerSessionCost(squashSession, 'Alice')).toBe(21.25);
    });

    it('multisport player pays share minus 15 discount', () => {
      // 85 / 4 = 21.25 - 15 = 6.25
      expect(getPlayerSessionCost(squashSession, 'Bob')).toBe(6.25);
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
      // 20 / 2 = 10 - 15 = -5 → clamped to 0
      expect(getPlayerSessionCost(cheapSession, 'Bob')).toBe(0);
    });
  });

  describe('squash pricing tiers', () => {
    it('85 zł / 0 cards = full price per person', () => {
      const s = { totalCost: 85, presentPlayers: ['A','B','C','D'], multisportPlayers: [], sport: 'squash' };
      expect(getPlayerSessionCost(s, 'A')).toBe(21.25);
    });

    it('70 zł / 1 card: multisport person gets discount', () => {
      const s = { totalCost: 70, presentPlayers: ['A','B','C','D'], multisportPlayers: ['A'], sport: 'squash' };
      expect(getPlayerSessionCost(s, 'A')).toBe(2.5); // 17.5 - 15
      expect(getPlayerSessionCost(s, 'B')).toBe(17.5);
    });

    it('55 zł / 2 cards: both multisport get discount', () => {
      const s = { totalCost: 55, presentPlayers: ['A','B','C','D'], multisportPlayers: ['A','B'], sport: 'squash' };
      expect(getPlayerSessionCost(s, 'A')).toBe(0); // 13.75 - 15 → 0
      expect(getPlayerSessionCost(s, 'C')).toBe(13.75);
    });
  });
});

describe('getSessionBaseCost', () => {
  it('ping-pong: base cost is split among paying players', () => {
    const s = { totalCost: 60, presentPlayers: ['A','B','C'], multisportPlayers: ['C'], sport: 'pingpong' };
    expect(getSessionBaseCost(s)).toBe(30);
  });

  it('squash: base cost is split among all players', () => {
    const s = { totalCost: 85, presentPlayers: ['A','B','C','D'], multisportPlayers: ['A'], sport: 'squash' };
    expect(getSessionBaseCost(s)).toBe(21.25);
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
