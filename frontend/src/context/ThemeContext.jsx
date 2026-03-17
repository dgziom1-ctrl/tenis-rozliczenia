import { createContext, useContext } from 'react';

export const ThemeContext = createContext('cyber');

const CYBER_TOKENS = {
  confirmBg:        'var(--co-cyan)',
  confirmBorder:    'var(--co-cyan)',
  confirmText:      '#030508',
  accentBorder:     'rgba(0,229,255,0.35)',
  accentText:       'var(--co-cyan)',
  accentBg:         'rgba(0,229,255,0.05)',
  accentColor:      'var(--co-cyan)',
  cancelBorder:     'var(--co-border)',
  cancelText:       'var(--co-dim)',
  overlayBg:        'rgba(0,0,0,0.95)',
  modalBg:          '#060C12',
  modalRadius:      '0px',
  modalShadow:      '0 0 40px rgba(0,229,255,0.12), 0 2px 40px rgba(0,0,0,0.95)',
  inputBg:          '#030508',
  inputBorder:      'var(--co-border-hi)',
  inputText:        'var(--co-text-hi)',
  cellBg:           '#060C12',
  cellBorder:       'var(--co-border)',
  cellLabelText:    'var(--co-dim)',
  bodyText:         'var(--co-text)',
  mutedText:        'var(--co-dim)',
  undoBg:           '#060C12',
  undoBorder:       'rgba(0,229,255,0.22)',
  undoText:         'var(--co-text)',
  undoProgressBg:   'var(--co-cyan)',
  fontFamily:       "'Bebas Neue', monospace",
  fontSize:         '0.9rem',
};

export function useThemeTokens() {
  return CYBER_TOKENS;
}
