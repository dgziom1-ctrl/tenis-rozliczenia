import type { Rank } from '@/types/ui';

/**
 * Rangi frekwencji.
 *
 * Każda ranga miała wcześniej cztery pola koloru: `color`, `bg` i `border` z
 * klasami Tailwind oraz `hex`. Trzy pierwsze nie były czytane nigdzie — tylko
 * `hex` trafia do interfejsu — więc zostały usunięte.
 *
 * Same wartości `hex` były dobrane pod ciemne tło i w trybie jasnym przestawały
 * być czytelne, a oryginalna paleta (magenta, fiolet, morski) kłóciła się z
 * ciepłą, klubową kolorystyką. Nowe tony trzymają jedną ciepłą progresję
 * złoto → glina → orchidea → szałwia → ciepły szary → stal i przekraczają
 * 3:1 w obu motywach.
 */
export const RANKS: Rank[] = [
  { min: 90, emoji: '🏆', name: 'LEGENDA', hex: '#B8860B' }, // 3,3:1 / 5,9:1
  { min: 75, emoji: '⭐',  name: 'MISTRZ',  hex: '#C07468' }, // 3,5:1 / 5,5:1
  { min: 60, emoji: '🎖️', name: 'WETERAN', hex: '#9A6BB8' }, // 4,1:1 / 4,8:1
  { min: 45, emoji: '🔥', name: 'STAŁY',   hex: '#2F7D5B' }, // 5,0:1 / 3,9:1
  { min: 20, emoji: '👀', name: 'GOŚĆ',    hex: '#7A756C' }, // 4,6:1 / 4,2:1
  { min:  0, emoji: '👻', name: 'DUCH',    hex: '#5E6A7A' }, // 5,5:1 / 3,5:1
];

export function getRank(pct: number): Rank {
  return RANKS.find(r => pct >= r.min) ?? RANKS[RANKS.length - 1];
}

export const PODIUM_ORDER = [2, 1, 3] as const;
