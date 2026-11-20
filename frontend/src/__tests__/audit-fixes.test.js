import { describe, it, expect } from 'vitest';
import { parseAmount } from '../utils/format';
import { toGrosze } from '../utils/money';
import { longestStreakOf } from '../utils/playerHistory';
import { SPORT, SPORTS, isSport } from '../constants';

describe('parseAmount — spójne zaokrąglanie z toGrosze', () => {
  it('"1.005" daje 1,01 (nie 1,00 przez błąd zmiennoprzecinkowy)', () => {
    expect(parseAmount('1.005')).toBe(1.01);
    expect(parseAmount('1,005')).toBe(1.01);
    expect(toGrosze(parseAmount('1.005'))).toBe(101);
  });

  it('zwykłe kwoty i niepoprawne wejście bez zmian', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount(' 1 000,5 ')).toBe(1000.5);
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });
});

describe('longestStreakOf', () => {
  // historia od najnowszej do najstarszej
  const h = (...flags) => flags.map(f => ({ presentPlayers: f ? ['Ala'] : ['Ola'] }));

  it('liczy najdłuższą serię kolejnych obecności', () => {
    expect(longestStreakOf('Ala', h(1, 1, 0, 1, 1, 1, 0, 1))).toBe(3);
  });

  it('zwraca 0 bez obecności i dla pustej historii', () => {
    expect(longestStreakOf('Ala', h(0, 0))).toBe(0);
    expect(longestStreakOf('Ala', [])).toBe(0);
  });

  it('cała historia to jedna seria', () => {
    expect(longestStreakOf('Ala', h(1, 1, 1, 1))).toBe(4);
  });
});

describe('lista sportów', () => {
  it('SPORTS pokrywa wszystkie wartości SPORT w stałej kolejności', () => {
    expect([...SPORTS]).toEqual(Object.values(SPORT));
  });

  it('isSport przepuszcza tylko znane dyscypliny', () => {
    expect(isSport('padel')).toBe(true);
    expect(isSport('tenis')).toBe(false);
    expect(isSport(undefined)).toBe(false);
    expect(isSport(5)).toBe(false);
  });
});
