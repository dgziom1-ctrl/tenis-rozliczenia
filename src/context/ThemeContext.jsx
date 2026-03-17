import { createContext, useContext } from 'react';

export const ThemeContext = createContext('cyber');

const CYBER_TOKENS = {
  confirmBg:        'var(--cz-orange)',
  confirmBorder:    'var(--cz-orange)',
  confirmText:      '#0A0A08',
  accentBorder:     'rgba(232,89,10,0.4)',
  accentText:       'var(--cz-orange)',
  accentBg:         'rgba(232,89,10,0.06)',
  accentColor:      'var(--cz-orange)',
  cancelBorder:     '#2A2A24',
  cancelText:       '#5A5A54',
  overlayBg:        'rgba(0,0,0,0.95)',
  modalBg:          '#0A0A08',
  modalRadius:      '0px',
  modalShadow:      '0 0 50px rgba(232,89,10,0.14), 0 2px 40px rgba(0,0,0,0.95)',
  inputBg:          '#060604',
  inputBorder:      '#2A2A24',
  inputText:        '#E8E4DA',
  cellBg:           '#080806',
  cellBorder:       '#1A1A14',
  cellLabelText:    '#4A4640',
  bodyText:         '#C8C4BA',
  mutedText:        '#4A4640',
  undoBg:           '#0A0A08',
  undoBorder:       'rgba(232,89,10,0.28)',
  undoText:         '#C8C4BA',
  undoProgressBg:   'var(--cz-orange)',
  fontFamily:       "'Bebas Neue', monospace",
  fontSize:         '0.9rem',
};

export function useThemeTokens() {
  return CYBER_TOKENS;
}
