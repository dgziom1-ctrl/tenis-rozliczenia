import { describe, it, expect } from 'vitest';
import { getLastSessionDefaults } from '../utils/sessions';

const history = [
  {
    id: 'old',
    datePlayed: '2026-01-10',
    sport: 'pingpong',
    totalCost: 100,
    costPerPerson: 20,
    costPerPersonMulti: 10,
    presentPlayers: ['Ala', 'Bob'],
    multisportPlayers: ['Bob'],
    courtCount: 1,
    durationHours: 1,
  },
  {
    id: 'latest',
    datePlayed: '2026-03-01',
    sport: 'squash',
    totalCost: 120,
    costPerPerson: 30,
    costPerPersonMulti: 15,
    presentPlayers: ['Ala', 'Bob', 'Cela'],
    multisportPlayers: ['Ala', 'Cela', 'Usunięty'],
    courtCount: 2,
    durationHours: 2,
  },
];

describe('getLastSessionDefaults', () => {
  it('bierze najpóźniejszą sesję, a nie kolejność tablicy', () => {
    const defaults = getLastSessionDefaults(history, ['Ala', 'Bob', 'Cela']);
    expect(defaults).toMatchObject({
      presentPlayers: ['Ala', 'Bob', 'Cela'],
      multisportPlayers: ['Ala', 'Cela'],
      courtCount: 2,
      durationHours: 2,
      sport: 'squash',
    });
  });

  it('odsiewa osoby, których nie ma już w aktywnym składzie', () => {
    const defaults = getLastSessionDefaults(history, ['Ala', 'Cela']);
    expect(defaults.presentPlayers).toEqual(['Ala', 'Cela']);
    expect(defaults.multisportPlayers).toEqual(['Ala', 'Cela']);
  });

  it('zwraca null, gdy nie ma historii albo składu', () => {
    expect(getLastSessionDefaults([], ['Ala'])).toBeNull();
    expect(getLastSessionDefaults(history, [])).toBeNull();
    expect(getLastSessionDefaults(history, ['Nieobecny'])).toBeNull();
  });
});
