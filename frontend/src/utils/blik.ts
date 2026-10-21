/**
 * Numer BLIK, na który gracze robią przelewy ręcznie.
 *
 * Aplikacja nie wykonuje przelewu — pokazuje tylko numer i zapisuje wpłatę.
 * Trzymamy go w jednym miejscu, żeby nagłówek, modal i przewodnik nie mogły
 * pokazać trzech różnych wartości.
 */
export const BLIK_NUMBER = import.meta.env.VITE_BLIK_NUMBER || 'SKONFIGURUJ .ENV';
