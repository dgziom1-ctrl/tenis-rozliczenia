export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function formatAmount(value: number, withSymbol = true): string {
  const str = Number(value).toFixed(2).replace('.', ',');
  return withSymbol ? `${str} zł` : str;
}

export function formatAmountShort(value: number): string {
  return formatAmount(value, false);
}

/**
 * Odmiana rzeczownika po liczbie (1 rekord, 2 rekordy, 5 rekordów).
 *
 * Liczniki w interfejsie są zdaniami, więc „22 REKORDÓW" nie może zostać:
 * poprawna forma zależy od liczby, a nie od tego, czy etykieta jest ozdobna.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(count);
  const lastTwo = absolute % 100;
  const last = absolute % 10;
  if (absolute === 1) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

/**
 * Parsuje kwotę wpisaną przez użytkownika, akceptując przecinek jako separator
 * dziesiętny (typowy dla polskiej klawiatury) oraz spacje jako separator tysięcy.
 * Zwraca liczbę zaokrągloną do 2 miejsc lub NaN, gdy wejście jest nieprawidłowe.
 */
export function parseAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.round(input * 100) / 100 : NaN;
  }
  if (typeof input !== 'string') return NaN;
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return NaN;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/** Czy `value` jest poprawną kwotą >= min (domyślnie 0). */
export function isValidAmount(value: number, min = 0): boolean {
  return Number.isFinite(value) && value >= min;
}
