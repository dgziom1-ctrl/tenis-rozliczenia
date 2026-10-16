import type { PlayerColor } from '@/types/ui';

/**
 * Kolory tożsamości graczy — jedna paleta dla obu motywów.
 *
 * Poprzedni zestaw był neonem dobranym wyłącznie pod ciemne tło i w trybie
 * jasnym trzy z sześciu kolorów przestawały być czytelne jako tekst. Nowy
 * zestaw jest cieplejszy (glina, szałwia, orchidea, brąz) z dwoma chłodnymi
 * kontrapunktami (stal, morska), żeby sąsiednie kafle wciąż się różniły.
 *
 * Żaden pojedynczy kolor nie zdaje 4,5:1 na czerni i na bieli jednocześnie —
 * te progi się wykluczają. Dobrane są więc tony środkowe, które wszędzie
 * przekraczają 3:1 (próg dla dużego tekstu i elementów interfejsu, czyli tego,
 * do czego paleta służy: obramowań, inicjałów awatara i nazw w dużym stopniu).
 */
const PLAYER_COLOR_PALETTE: PlayerColor[] = [
  { bg: '#C0746818', border: '#C07468', text: '#C07468' }, // glina     3,5:1 / 5,5:1
  { bg: '#3E6FA818', border: '#3E6FA8', text: '#3E6FA8' }, // stal      3,7:1 / 5,2:1
  { bg: '#3E7D5A18', border: '#3E7D5A', text: '#3E7D5A' }, // szałwia   3,9:1 / 4,9:1
  { bg: '#8A5BA818', border: '#8A5BA8', text: '#8A5BA8' }, // orchidea  3,8:1 / 5,1:1
  { bg: '#A9743F18', border: '#A9743F', text: '#A9743F' }, // brąz      3,7:1 / 4,6:1
  { bg: '#2C7A7B18', border: '#2C7A7B', text: '#2C7A7B' }, // morska    3,7:1 / 5,0:1
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
