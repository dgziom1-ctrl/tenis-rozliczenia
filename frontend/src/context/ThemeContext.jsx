import { createContext, useContext, useMemo } from 'react';

export const ThemeContext = createContext('cyber');

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Returns a memoised flat token object for the current theme.
 * The memo is invalidated only when the theme changes — no new object every render.
 */
export function useThemeTokens() {
  const theme = useTheme();
  return useMemo(() => getThemeTokens(theme), [theme]);
}

// ─── Theme token maps ─────────────────────────────────────────────────────────
// Each key is a theme name. Adding a new theme = adding one entry here, nothing else.

const THEMES = {
  arcade: {
    overlayBg:        'rgba(0,0,0,0.94)',
    modalBg:          '#010300',
    modalBorder:      '#39ff14',
    modalShadow:      '0 0 0 1px #39ff14, 0 0 40px rgba(57,255,20,0.12)',
    modalRadius:      '0',
    accentColor:      '#39ff14',
    accentBg:         'rgba(57,255,20,0.08)',
    accentBorder:     '#39ff14',
    accentText:       '#39ff14',
    mutedText:        '#3a8c10',
    mutedBorder:      '#1a4d00',
    mutedBg:          '#010300',
    headingText:      '#39ff14',
    bodyText:         '#c8f0b8',
    cellBg:           '#010300',
    cellBorder:       '#1a4d00',
    cellLabelText:    '#3a8c10',
    confirmBg:        'rgba(57,255,20,0.1)',
    confirmBorder:    '#39ff14',
    confirmText:      '#39ff14',
    confirmHover:     '#39ff14',
    confirmHoverText: '#010300',
    cancelBorder:     '#1a4d00',
    cancelText:       '#3a8c10',
    toastInfoBg:      '#010300',
    toastInfoBorder:  '#39ff14',
    toastInfoText:    '#39ff14',
    fontFamily:       "'Press Start 2P', monospace",
    fontSize:         '0.65rem',
    inputBg:          '#010300',
    inputBorder:      '#1a4d00',
    inputText:        '#39ff14',
    inputFocus:       '#39ff14',
    undoBg:           'rgba(57,255,20,0.05)',
    undoBorder:       '#39ff14',
    undoText:         '#39ff14',
    undoProgressBg:   '#39ff14',
  },

  zen: {
    overlayBg:        'rgba(61,48,37,0.7)',
    modalBg:          '#f0ebe0',
    modalBorder:      '#c2b49a',
    modalShadow:      '0 8px 40px rgba(61,48,37,0.22), 0 2px 8px rgba(61,48,37,0.1)',
    modalRadius:      '1.25rem',
    accentColor:      '#2d6a4f',
    accentBg:         'rgba(45,106,79,0.08)',
    accentBorder:     '#2d6a4f',
    accentText:       '#2d6a4f',
    mutedText:        '#8a9e8a',
    mutedBorder:      '#c2b49a',
    mutedBg:          'rgba(210,205,195,0.5)',
    headingText:      '#2d6a4f',
    bodyText:         '#3d3025',
    cellBg:           'rgba(220,215,205,0.6)',
    cellBorder:       '#c2b49a',
    cellLabelText:    '#8a9e8a',
    confirmBg:        'rgba(45,106,79,0.08)',
    confirmBorder:    '#2d6a4f',
    confirmText:      '#2d6a4f',
    confirmHover:     '#2d6a4f',
    confirmHoverText: '#f0ebe0',
    cancelBorder:     '#c2b49a',
    cancelText:       '#8a9e8a',
    toastInfoBg:      '#f0ebe0',
    toastInfoBorder:  '#2d6a4f',
    toastInfoText:    '#2d6a4f',
    fontFamily:       "'Lato', sans-serif",
    fontSize:         '0.875rem',
    inputBg:          '#e8ede8',
    inputBorder:      '#b8ccb8',
    inputText:        '#3d3025',
    inputFocus:       '#2d6a4f',
    undoBg:           'rgba(45,106,79,0.06)',
    undoBorder:       '#2d6a4f',
    undoText:         '#2d6a4f',
    undoProgressBg:   '#2d6a4f',
  },

  cyber: {
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
  },
};

export const getThemeTokens = (theme) => THEMES[theme] ?? THEMES.cyber;
