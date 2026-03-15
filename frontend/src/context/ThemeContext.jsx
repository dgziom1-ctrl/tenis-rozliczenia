import { createContext, useContext, useMemo } from 'react';

export const ThemeContext = createContext('cyber');

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Returns the single (cyber) token object.
 * Kept as a memoised hook so call-sites don't need changing.
 */
export function useThemeTokens() {
  return useMemo(() => CYBER_TOKENS, []);
}

export const getThemeTokens = () => CYBER_TOKENS;

// ─── Single-theme token map ───────────────────────────────────────────────────
const CYBER_TOKENS = {
  overlayBg:        'rgba(4,6,16,0.88)',
  modalBg:          '#0d1220',
  modalBorder:      'rgba(148,163,184,0.12)',
  modalShadow:      '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(148,163,184,0.08)',
  modalRadius:      '1rem',
  accentColor:      '#818cf8',
  accentBg:         'rgba(129,140,248,0.07)',
  accentBorder:     'rgba(129,140,248,0.35)',
  accentText:       '#a5b4fc',
  mutedText:        'rgba(148,163,184,0.45)',
  mutedBorder:      'rgba(148,163,184,0.1)',
  mutedBg:          'rgba(4,6,16,0.5)',
  headingText:      '#e2e8f0',
  bodyText:         '#94a3b8',
  cellBg:           'rgba(8,12,24,0.7)',
  cellBorder:       'rgba(148,163,184,0.08)',
  cellLabelText:    'rgba(148,163,184,0.4)',
  confirmBg:        'rgba(129,140,248,0.08)',
  confirmBorder:    'rgba(129,140,248,0.4)',
  confirmText:      '#a5b4fc',
  confirmHover:     '#818cf8',
  confirmHoverText: '#080c18',
  cancelBorder:     'rgba(148,163,184,0.12)',
  cancelText:       'rgba(148,163,184,0.4)',
  toastInfoBg:      '#0d1220',
  toastInfoBorder:  'rgba(129,140,248,0.3)',
  toastInfoText:    '#a5b4fc',
  fontFamily:       "'Inter', system-ui, sans-serif",
  fontSize:         '0.875rem',
  inputBg:          '#080c18',
  inputBorder:      'rgba(148,163,184,0.12)',
  inputText:        '#e2e8f0',
  inputFocus:       '#818cf8',
  undoBg:           'rgba(52,211,153,0.05)',
  undoBorder:       'rgba(52,211,153,0.3)',
  undoText:         'rgb(52,211,153)',
  undoProgressBg:   'rgb(16,185,129)',
};
