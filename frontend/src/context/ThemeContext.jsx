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
    overlayBg:        'rgba(0,0,0,0.85)',
    modalBg:          '#0d1424',
    modalBorder:      'rgba(56,189,248,0.4)',
    modalShadow:      '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.1)',
    modalRadius:      '1rem',
    accentColor:      '#38bdf8',
    accentBg:         'rgba(56,189,248,0.08)',
    accentBorder:     'rgba(56,189,248,0.4)',
    accentText:       '#7dd3fc',
    mutedText:        'rgba(148,163,184,0.5)',
    mutedBorder:      'rgba(56,189,248,0.12)',
    mutedBg:          'rgba(0,0,0,0.35)',
    headingText:      '#38bdf8',
    bodyText:         '#cbd5e1',
    cellBg:           'rgba(6,9,15,0.7)',
    cellBorder:       'rgba(56,189,248,0.1)',
    cellLabelText:    'rgba(148,163,184,0.45)',
    confirmBg:        'rgba(56,189,248,0.1)',
    confirmBorder:    'rgba(56,189,248,0.5)',
    confirmText:      '#7dd3fc',
    confirmHover:     '#38bdf8',
    confirmHoverText: '#06090f',
    cancelBorder:     'rgba(56,189,248,0.15)',
    cancelText:       'rgba(148,163,184,0.5)',
    toastInfoBg:      'rgba(8,14,26,0.97)',
    toastInfoBorder:  'rgba(56,189,248,0.4)',
    toastInfoText:    '#7dd3fc',
    fontFamily:       "'Inter', system-ui, sans-serif",
    fontSize:         '0.875rem',
    inputBg:          '#080e1a',
    inputBorder:      'rgba(56,189,248,0.2)',
    inputText:        '#bae6fd',
    inputFocus:       '#38bdf8',
    undoBg:           'rgba(16,185,129,0.06)',
    undoBorder:       'rgba(16,185,129,0.5)',
    undoText:         'rgb(52,211,153)',
    undoProgressBg:   'rgb(16,185,129)',
  },
};

export const getThemeTokens = (theme) => THEMES[theme] ?? THEMES.cyber;
