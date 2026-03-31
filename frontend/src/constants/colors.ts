import type { PlayerColor } from '@/types/ui';

export const PLAYER_COLOR_PALETTE: PlayerColor[] = [
  { bg: '#FF008018', border: '#FF0080', text: '#FF0080' },
  { bg: '#0080FF18', border: '#0080FF', text: '#0080FF' },
  { bg: '#CCFF0018', border: '#AACC00', text: '#AACC00' },
  { bg: '#CC00FF18', border: '#CC00FF', text: '#CC00FF' },
  { bg: '#00FFFF18', border: '#00CCDD', text: '#00CCDD' },
  { bg: '#FF9B0018', border: '#FF9B00', text: '#FF9B00' },
];

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
