import { createContext, useContext } from 'react';

export const ThemeContext = createContext('dark');

export const CYBER_TOKENS = {
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

export const LIGHT_TOKENS = {
  confirmBg:        '#0891b2',
  confirmBorder:    '#0891b2',
  confirmText:      '#ffffff',
  accentBorder:     'rgba(8,145,178,0.35)',
  accentText:       '#0e7490',
  accentBg:         'rgba(8,145,178,0.08)',
  accentColor:      '#0891b2',
  cancelBorder:     '#d1d5db',
  cancelText:       '#6b7280',
  overlayBg:        'rgba(0,0,0,0.5)',
  modalBg:          '#ffffff',
  modalRadius:      '12px',
  modalShadow:      '0 4px 24px rgba(0,0,0,0.15)',
  inputBg:          '#f9fafb',
  inputBorder:      '#d1d5db',
  inputText:        '#111827',
  cellBg:           '#f9fafb',
  cellBorder:       '#e5e7eb',
  cellLabelText:    '#6b7280',
  bodyText:         '#1f2937',
  mutedText:        '#6b7280',
  undoBg:           '#ffffff',
  undoBorder:       'rgba(8,145,178,0.3)',
  undoText:         '#1f2937',
  undoProgressBg:   '#0891b2',
  fontFamily:       "'Bebas Neue', monospace",
  fontSize:         '0.9rem',
};

export function useThemeTokens() {
  const theme = useContext(ThemeContext);
  return theme === 'light' ? LIGHT_TOKENS : CYBER_TOKENS;
}
