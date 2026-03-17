import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, formatAmountShort } from '../utils/format';

describe('formatDate', () => {
  it('converts ISO to Polish format', () => {
    expect(formatDate('2025-03-08')).toBe('08.03.2025');
  });
  it('returns empty string for falsy input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('formatAmount', () => {
  it('uses comma as decimal separator', () => {
    expect(formatAmount(13.75)).toBe('13,75 zł');
  });
  it('appends zł symbol by default', () => {
    expect(formatAmount(10)).toContain('zł');
  });
  it('omits symbol when withSymbol=false', () => {
    expect(formatAmount(10, false)).toBe('10,00');
  });
  it('formats whole number with two decimals', () => {
    expect(formatAmount(5)).toBe('5,00 zł');
  });
});

describe('formatAmountShort', () => {
  it('formats without zł symbol', () => {
    expect(formatAmountShort(13.75)).toBe('13,75');
  });
  it('always shows two decimal places', () => {
    expect(formatAmountShort(5)).toBe('5,00');
  });
});
