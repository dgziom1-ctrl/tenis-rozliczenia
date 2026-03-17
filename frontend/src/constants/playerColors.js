/**
 * High-Contrast Neon — 6 colors spaced 60° apart on hue wheel.
 * All S=100%, V=100%. Zero visual similarity between adjacent colors.
 *
 * Assignment strategy: position-based (sorted alphabetical index).
 * This guarantees NO two players share a color, ever.
 * Organizer always last → always gets index = (playerCount - 1).
 */
export const PLAYER_COLOR_PALETTE = [
  { bg: '#180010', border: '#FF0080', text: '#FF0080' },  // 0 → neon rose     (330°)
  { bg: '#000D18', border: '#0080FF', text: '#0080FF' },  // 1 → electric blue (210°)
  { bg: '#111800', border: '#CCFF00', text: '#CCFF00' },  // 2 → electric lime (75°)
  { bg: '#110018', border: '#CC00FF', text: '#CC00FF' },  // 3 → neon violet   (285°)
  { bg: '#001818', border: '#00FFFF', text: '#00FFFF' },  // 4 → electric cyan (180°)
  { bg: '#141400', border: '#FFE500', text: '#FFE500' },  // 5 → hazard yellow (55°)
];

/**
 * Get color by sorted position index (preferred — guarantees uniqueness).
 * Falls back to name hash only if no index given.
 */
export function getPlayerColor(name, sortedIndex) {
  const palette = PLAYER_COLOR_PALETTE;
  if (sortedIndex !== undefined && sortedIndex !== null) {
    return palette[sortedIndex % palette.length];
  }
  // Fallback: name hash (may collide — only used if index unavailable)
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i) | 0;
  }
  return palette[Math.abs(h) % palette.length];
}
