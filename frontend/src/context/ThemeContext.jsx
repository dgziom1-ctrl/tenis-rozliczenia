import { createContext, useContext } from 'react';

export const ThemeContext = createContext('cyber');

const CYBER_TOKENS = {
  confirmBg:        'var(--sw-pink)',
  confirmBorder:    'var(--sw-pink)',
  confirmText:      '#0B0015',
  accentBorder:     'rgba(255,0,255,0.4)',
  accentText:       'var(--sw-pink)',
  accentBg:         'rgba(255,0,255,0.06)',
  accentColor:      'var(--sw-pink)',
  cancelBorder:     '#2A2A24',
  cancelText:       '#5A5A54',
  overlayBg:        'rgba(0,0,0,0.95)',
  modalBg:          '#0B0015',
  modalRadius:      '0px',
  modalShadow:      '0 0 50px rgba(255,0,255,0.14), 0 2px 40px rgba(0,0,0,0.95)',
  inputBg:          '#08000F',
  inputBorder:      '#2A2A24',
  inputText:        'var(--sw-text-hi)',
  cellBg:           '#0B0015',
  cellBorder:       '#1A1A14',
  cellLabelText:    'var(--sw-dim)',
  bodyText:         'var(--sw-text)',
  mutedText:        'var(--sw-dim)',
  undoBg:           '#0B0015',
  undoBorder:       'rgba(255,0,255,0.28)',
  undoText:         'var(--sw-text)',
  undoProgressBg:   'var(--sw-pink)',
  fontFamily:       "'Bebas Neue', monospace",
  fontSize:         '0.9rem',
};

export function useThemeTokens() {
  return CYBER_TOKENS;
}
