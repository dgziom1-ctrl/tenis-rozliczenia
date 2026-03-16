import { createContext, useContext } from 'react';

export const ThemeContext = createContext('cyber');

const CYBER_TOKENS = {
  // Primary confirm action (BLIK pay button)
  confirmBg:        'var(--cyber-accent)',
  confirmBorder:    'var(--cyber-accent)',
  confirmText:      '#ffffff',
  // Accent / secondary
  accentBorder:     'rgba(129,140,248,0.4)',
  accentText:       'var(--cyber-accent)',
  accentBg:         'rgba(129,140,248,0.06)',
  accentColor:      'var(--cyber-accent)',
  // Cancel / neutral
  cancelBorder:     '#2a2a2a',
  cancelText:       '#666666',
  // Modal overlays
  overlayBg:        'rgba(0,0,0,0.94)',
  modalBg:          '#0a0a0a',
  modalRadius:      '0px',
  modalShadow:      '0 0 50px rgba(129,140,248,0.18), 0 2px 40px rgba(0,0,0,0.9)',
  // Input fields
  inputBg:          '#060606',
  inputBorder:      '#2a2a2a',
  inputText:        '#e8e8e8',
  // Cell / breakdown table
  cellBg:           '#080808',
  cellBorder:       '#181818',
  cellLabelText:    '#555555',
  // Body text
  bodyText:         '#e8e8e8',
  mutedText:        '#555555',
  // Undo bar
  undoBg:           '#080808',
  undoBorder:       'rgba(129,140,248,0.25)',
  undoText:         '#c8c8c8',
  undoProgressBg:   'var(--cyber-accent)',
  // Font
  fontFamily:       "'Orbitron', monospace",
  fontSize:         '0.85rem',
};

export function useThemeTokens() {
  return CYBER_TOKENS;
}
