import type { PlayerColor } from '@/types/ui';

/**
 * Kolory tożsamości graczy — jedna paleta dla obu motywów.
 *
 * Poprzedni zestaw był neonem dobranym wyłącznie pod ciemne tło i w trybie
 * jasnym trzy z sześciu kolorów przestawały być czytelne jako tekst: limonka
 * `#AACC00` miała 1,77:1, morski `#00CCDD` 1,88:1, pomarańcz `#FF9B00` 2,02:1.
 *
 * Żaden pojedynczy kolor nie zdaje 4,5:1 na czerni i na bieli jednocześnie —
 * te progi się wykluczają. Dobrane są więc tony środkowe, które wszędzie
 * przekraczają 3:1 (próg dla dużego tekstu i elementów interfejsu, czyli tego,
 * do czego paleta służy: obramowań, inicjałów awatara i nazw w dużym stopniu),
 * a większość mieści się powyżej 4:1 w obu motywach.
 */
const PLAYER_COLOR_PALETTE: PlayerColor[] = [
  { bg: '#E0197A18', border: '#E0197A', text: '#E0197A' }, // róż      4,6:1 / 4,5:1
  { bg: '#2B7FD418', border: '#2B7FD4', text: '#2B7FD4' }, // błękit   4,1:1 / 5,0:1
  { bg: '#47962618', border: '#479626', text: '#479626' }, // zieleń   3,7:1 / 5,5:1
  { bg: '#9B4DE018', border: '#9B4DE0', text: '#9B4DE0' }, // fiolet   4,6:1 / 4,4:1
  { bg: '#148A9C18', border: '#148A9C', text: '#148A9C' }, // morski   4,1:1 / 5,0:1
  { bg: '#D9770618', border: '#D97706', text: '#D97706' }, // pomarańcz 3,2:1 / 6,4:1
];

/** Ile kolorów ma paleta — do rozdzielania serii na wykresach. */
export const PLAYER_COLOR_COUNT = PLAYER_COLOR_PALETTE.length;

export function getPlayerColor(name: string, sortedIndex?: number): PlayerColor {
  const palette = PLAYER_COLOR_PALETTE;
  if (sortedIndex !== undefined && sortedIndex !== null) {
    return palette[sortedIndex % palette.length];
  }
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i) | 0;
  }
  return palette[Math.abs(h) % palette.length];
}
