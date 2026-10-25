import type { Rank } from '@/types/ui';

/**
 * Rangi frekwencji.
 *
 * Każda ranga miała wcześniej cztery pola koloru: `color`, `bg` i `border` z
 * klasami Tailwind oraz `hex`. Trzy pierwsze nie były czytane nigdzie — tylko
 * `hex` trafia do interfejsu — więc zostały usunięte.
 *
 * Kolor rangi jest tokenem motywu (`--rank-*` w `index.css`), a nie literałem:
 * jeden kolor nie może przejść 4,5:1 jednocześnie na prawie czarnym i prawie
 * białym tle (wymagana luminancja to wąski przedział 0,183–0,199). Wartości
 * w obu motywach pilnuje `npm run audit:contrast`; nazwa, ikona, obramowanie
 * i pasek postępu czytają ten sam token, więc nie mogą się rozjechać.
 */
export const RANKS: Rank[] = [
  { min: 90, name: 'LEGENDA', hex: 'var(--rank-legenda)' },
  { min: 75, name: 'MISTRZ',  hex: 'var(--rank-mistrz)' },
  { min: 60, name: 'WETERAN', hex: 'var(--rank-weteran)' },
  { min: 45, name: 'STAŁY',   hex: 'var(--rank-staly)' },
  { min: 20, name: 'GOŚĆ',    hex: 'var(--rank-gosc)' },
  { min: 0,  name: 'DUCH',    hex: 'var(--rank-duch)' },
];

/**
 * Tło/obramowanie w kolorze rangi o zadanym kryciu.
 *
 * Wcześniej sklejano hex z alfą (`${hex}10`). Tokenów CSS nie da się tak
 * dopisać — `var(--rank-legenda)10` jest nieprawidłową deklaracją — więc
 * przezroczystość liczy `color-mix`. Starsza przeglądarka bez `color-mix`
 * po prostu nie pokaże tła, zachowując czytelny tekst.
 */
export function rankTint(rank: Rank, percent: number): string {
  return `color-mix(in srgb, ${rank.hex} ${percent}%, transparent)`;
}

export function getRank(pct: number): Rank {
  return RANKS.find(r => pct >= r.min) ?? RANKS[RANKS.length - 1];
}

export const PODIUM_ORDER = [2, 1, 3] as const;
