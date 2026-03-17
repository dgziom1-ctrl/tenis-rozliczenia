/**
 * Shared player color palette — deterministic by player name.
 * Both PlayerCard (dashboard) and PlayersTab (gracze) use this.
 * Colors are assigned by hashing the player's name so the same
 * player always gets the same color regardless of list order.
 */
export const PLAYER_COLOR_PALETTE = [
  { bg: '#031420', border: '#00E5FF', text: '#00E5FF', tag: 'P1' },  // electric cyan
  { bg: '#031408', border: '#00FF88', text: '#00FF88', tag: 'P2' },  // matrix green
  { bg: '#0A0C20', border: '#4FC3F7', text: '#4FC3F7', tag: 'P3' },  // ice blue
  { bg: '#141400', border: '#C8E000', text: '#C8E000', tag: 'P4' },  // acid lime
  { bg: '#08081E', border: '#7B9FFF', text: '#8FAAFF', tag: 'P5' },  // periwinkle
  { bg: '#03141A', border: '#00D4CC', text: '#00D4CC', tag: 'P6' },  // teal
];

/**
 * Returns a stable color entry for a given player name.
 * Uses a simple hash so the same name always → same color.
 */
export function getPlayerColor(name) {
  if (!name) return PLAYER_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PLAYER_COLOR_PALETTE[hash % PLAYER_COLOR_PALETTE.length];
}
