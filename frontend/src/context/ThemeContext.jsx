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

export function getThemeTokens(theme) {
  if (theme === 'arcade') return {
    overlayBg:        'rgba(0,0,0,0.92)',
    modalBg:          '#010300',
    modalBorder:      '#39ff14',
    modalShadow:      '0 0 30px rgba(57,255,20,0.15)',
    modalRadius:      '0',
    accentColor:      '#39ff14',
    accentBg:         'rgba(57,255,20,0.08)',
    accentBorder:     '#39ff14',
    accentText:       '#39ff14',
    mutedText:        '#176604',
    mutedBorder:      '#0d2900',
    mutedBg:          '#010300',
    headingText:      '#39ff14',
    bodyText:         '#c8f0b8',
    cellBg:           '#010300',
    cellBorder:       '#0d2900',
    cellLabelText:    '#176604',
    confirmBg:        'rgba(57,255,20,0.1)',
    confirmBorder:    '#39ff14',
    confirmText:      '#39ff14',
    confirmHover:     '#39ff14',
    confirmHoverText: '#010300',
    cancelBorder:     '#0d2900',
    cancelText:       '#176604',
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
  };

  if (theme === 'zen') return {
    overlayBg:        'rgba(61,48,37,0.65)',
    modalBg:          '#f0ebe0',
    modalBorder:      '#c2b49a',
    modalShadow:      '0 8px 32px rgba(61,48,37,0.2)',
    modalRadius:      '1.25rem',
    accentColor:      '#2d6a4f',
    accentBg:         'rgba(45,106,79,0.08)',
    accentBorder:     '#2d6a4f',
    accentText:       '#2d6a4f',
    mutedText:        '#9aaa9a',
    mutedBorder:      '#c2b49a',
    mutedBg:          'rgba(210,205,195,0.5)',
    headingText:      '#2d6a4f',
    bodyText:         '#3d3025',
    cellBg:           'rgba(220,215,205,0.6)',
    cellBorder:       '#c2b49a',
    cellLabelText:    '#9aaa9a',
    confirmBg:        'rgba(45,106,79,0.08)',
    confirmBorder:    '#2d6a4f',
    confirmText:      '#2d6a4f',
    confirmHover:     '#2d6a4f',
    confirmHoverText: '#f0ebe0',
    cancelBorder:     '#c2b49a',
    cancelText:       '#9aaa9a',
    toastInfoBg:      '#f0ebe0',
    toastInfoBorder:  '#2d6a4f',
    toastInfoText:    '#2d6a4f',
    fontFamily:       "'Cinzel', serif",
    fontSize:         '0.75rem',
    inputBg:          '#e8ede8',
    inputBorder:      '#b8ccb8',
    inputText:        '#3d3025',
    inputFocus:       '#2d6a4f',
    undoBg:           'rgba(45,106,79,0.06)',
    undoBorder:       '#2d6a4f',
    undoText:         '#2d6a4f',
    undoProgressBg:   '#2d6a4f',
  };

  // cyber (default)
  return {
    overlayBg:        'rgba(0,0,0,0.82)',
    modalBg:          'rgb(17,24,39)',
    modalBorder:      'rgb(8,145,178)',
    modalShadow:      '0 0 30px rgba(6,182,212,0.15)',
    modalRadius:      '1rem',
    accentColor:      '#22d3ee',
    accentBg:         'rgba(8,145,178,0.15)',
    accentBorder:     'rgb(8,145,178)',
    accentText:       '#22d3ee',
    mutedText:        'rgb(51,65,85)',
    mutedBorder:      'rgb(22,78,99)',
    mutedBg:          'rgba(0,0,0,0.4)',
    headingText:      '#22d3ee',
    bodyText:         '#e2e8f0',
    cellBg:           'rgba(0,0,0,0.6)',
    cellBorder:       'rgb(22,78,99)',
    cellLabelText:    'rgb(51,65,85)',
    confirmBg:        'rgba(8,145,178,0.15)',
    confirmBorder:    'rgb(8,145,178)',
    confirmText:      '#22d3ee',
    confirmHover:     '#22d3ee',
    confirmHoverText: '#000',
    cancelBorder:     'rgb(22,78,99)',
    cancelText:       'rgb(51,65,85)',
    toastInfoBg:      'rgba(8,47,73,0.95)',
    toastInfoBorder:  'rgb(8,145,178)',
    toastInfoText:    '#22d3ee',
    fontFamily:       'inherit',
    fontSize:         '0.875rem',
    inputBg:          '#000',
    inputBorder:      'rgb(22,78,99)',
    inputText:        '#22d3ee',
    inputFocus:       '#22d3ee',
    undoBg:           'rgba(16,185,129,0.07)',
    undoBorder:       'rgb(16,185,129)',
    undoText:         'rgb(52,211,153)',
    undoProgressBg:   'rgb(16,185,129)',
  };
}
