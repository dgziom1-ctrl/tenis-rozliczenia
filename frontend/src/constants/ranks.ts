import type { Rank } from '@/types/ui';

/**
 * Rangi frekwencji.
 *
 * Każda ranga miała wcześniej cztery pola koloru: `color`, `bg` i `border` z
 * klasami Tailwind oraz `hex`. Trzy pierwsze nie były czytane nigdzie — tylko
 * `hex` trafia do interfejsu — więc zostały usunięte.
 *
 * Same wartości `hex` były dobrane pod ciemne tło i w trybie jasnym przestawały
 * być czytelne: złoto `#FFD700` miało 1,4:1 na bieli, a cyan `#00E5FF` 1,5:1 —
 * a to kolor nazwy rangi i odczytu procentowego w oknie gracza. Nowe tony
 * przekraczają 3:1 w obu motywach, zachowując progresję złoto → magenta →
 * fiolet → morski → szarość.
 */
export const RANKS: Rank[] = [
  { min: 90, emoji: '🏆', name: 'LEGENDA', hex: '#B8860B' }, // 3,3:1 / 6,3:1
  { min: 75, emoji: '⭐',  name: 'MISTRZ',  hex: '#E0197A' }, // 4,6:1 / 4,5:1
  { min: 60, emoji: '🎖️', name: 'WETERAN', hex: '#9B4DE0' }, // 4,6:1 / 4,4:1
  { min: 45, emoji: '🔥', name: 'STAŁY',   hex: '#148A9C' }, // 4,1:1 / 5,0:1
  { min: 20, emoji: '👀', name: 'GOŚĆ',    hex: '#64748B' }, // 4,6:1 / 4,3:1
  { min:  0, emoji: '👻', name: 'DUCH',    hex: '#556677' }, // 5,9:1 / 3,5:1
];

export function getRank(pct: number): Rank {
  return RANKS.find(r => pct >= r.min) ?? RANKS[RANKS.length - 1];
}

export const PODIUM_ORDER = [2, 1, 3] as const;
