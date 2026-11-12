import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, formatAmountShort, parseAmount, plural } from '../utils/format';

describe('formatDate', () => {
  it('zamienia ISO na format polski', () => {
    expect(formatDate('2025-03-08')).toBe('08.03.2025');
    expect(formatDate('2025-12-31')).toBe('31.12.2025');
    expect(formatDate('2024-02-29')).toBe('29.02.2024');
  });

  it('puste wejście daje pusty tekst', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatAmount', () => {
  it('używa przecinka i zawsze dwóch miejsc po przecinku', () => {
    expect(formatAmount(13.75)).toBe('13,75 zł');
    expect(formatAmount(5)).toBe('5,00 zł');
    expect(formatAmount(0)).toBe('0,00 zł');
  });

  it('obsługuje kwoty duże, ujemne (nadpłata) i tekstowe', () => {
    expect(formatAmount(99999.99)).toBe('99999,99 zł');
    expect(formatAmount(-5.5)).toBe('-5,50 zł');
    expect(formatAmount('13.75')).toBe('13,75 zł');
  });

  it('pomija symbol, gdy withSymbol=false', () => {
    expect(formatAmount(10, false)).toBe('10,00');
  });
});

describe('formatAmountShort', () => {
  it('formatuje bez symbolu zł, zawsze z groszami', () => {
    expect(formatAmountShort(13.75)).toBe('13,75');
    expect(formatAmountShort(5)).toBe('5,00');
  });
});

describe('parseAmount', () => {
  it('formatAmount → parseAmount wraca do tej samej liczby', () => {
    for (const value of [0, 5, 13.75, 99999.99]) {
      expect(parseAmount(formatAmount(value, false))).toBe(value);
    }
  });

  it('liczbę zaokrągla do groszy, a nieskończoność i inne typy odrzuca', () => {
    expect(parseAmount(12.345)).toBe(12.35);
    expect(parseAmount(Infinity)).toBeNaN();
    expect(parseAmount(null)).toBeNaN();
    expect(parseAmount(undefined)).toBeNaN();
  });
});

describe('plural — odmiana po liczbie', () => {
  const sesje = n => `${n} ${plural(n, 'sesja', 'sesje', 'sesji')}`;

  it.each([
    [0, '0 sesji'],
    [1, '1 sesja'],
    [2, '2 sesje'],
    [4, '4 sesje'],
    [5, '5 sesji'],
    [11, '11 sesji'],
    [12, '12 sesji'],
    [14, '14 sesji'],
    [21, '21 sesji'],
    [22, '22 sesje'],
    [112, '112 sesji'],
    [124, '124 sesje'],
  ])('%i → „%s”', (n, expected) => {
    expect(sesje(n)).toBe(expected);
  });

  it('liczba ujemna odmienia się jak dodatnia', () => {
    expect(plural(-2, 'sesja', 'sesje', 'sesji')).toBe('sesje');
  });
});
