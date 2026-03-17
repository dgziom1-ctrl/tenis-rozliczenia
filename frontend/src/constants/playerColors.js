/**
 * High-Contrast Neon Palette — 6 kolory rozłożone co 60° na kole barw.
 * Każdy kolor: S=100%, V=100% (pure saturated neon).
 * Wykluczone podobne odcienie — maksymalny kontrast między graczami.
 *
 * Hue 0°   → Czerwień/Magenta  #FF0080  (neon rose)
 * Hue 60°  → Żółty/Limonka     #CCFF00  (electric lime)
 * Hue 120° → Zielony            #00FF66  (matrix green)
 * Hue 180° → Cyan               #00FFFF  (electric cyan)
 * Hue 240° → Niebieski          #0080FF  (electric blue)
 * Hue 300° → Fiolet/Magenta     #CC00FF  (neon violet)
 */
export const PLAYER_COLOR_PALETTE = [
  { bg: '#180010', border: '#FF0080', text: '#FF0080' },  // 0°   neon rose
  { bg: '#111800', border: '#CCFF00', text: '#CCFF00' },  // 60°  electric lime
  { bg: '#001810', border: '#00FF66', text: '#00FF66' },  // 120° matrix green
  { bg: '#001818', border: '#00FFFF', text: '#00FFFF' },  // 180° electric cyan
  { bg: '#000D18', border: '#0080FF', text: '#0080FF' },  // 240° electric blue
  { bg: '#110018', border: '#CC00FF', text: '#CC00FF' },  // 300° neon violet
];

/**
 * Stable deterministic color by player name (hash).
 * Same name → always same color, regardless of list order or position.
 */
export function getPlayerColor(name) {
  if (!name) return PLAYER_COLOR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i) | 0;
  }
  return PLAYER_COLOR_PALETTE[Math.abs(h) % PLAYER_COLOR_PALETTE.length];
}
