import { createContext, useContext, useMemo } from 'react';

export const ThemeContext = createContext('cyber');

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeTokens() {
  const theme = useTheme();
  return useMemo(() => getThemeTokens(theme), [theme]);
}

const THEMES = {
  cyber: {
    overlayBg:        'rgba(0,0,0,0.88)',
    modalBg:          '#0f0f10',
    modalBorder:      'rgba(255,255,255,0.1)',
    modalShadow:      '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
    modalRadius:      '14px',
    accentColor:      'rgba(255,255,255,0.9)',
    accentBg:         'rgba(255,255,255,0.05)',
    accentBorder:     'rgba(255,255,255,0.15)',
    accentText:       'rgba(255,255,255,0.75)',
    mutedText:        'rgba(255,255,255,0.28)',
    mutedBorder:      'rgba(255,255,255,0.08)',
    mutedBg:          'rgba(255,255,255,0.03)',
    headingText:      'rgba(255,255,255,0.92)',
    bodyText:         'rgba(255,255,255,0.7)',
    cellBg:           'rgba(255,255,255,0.03)',
    cellBorder:       'rgba(255,255,255,0.07)',
    cellLabelText:    'rgba(255,255,255,0.22)',
    confirmBg:        'rgba(0,200,83,0.1)',
    confirmBorder:    'rgba(0,200,83,0.4)',
    confirmText:      '#00c853',
    confirmHover:     '#00c853',
    confirmHoverText: '#0a0a0b',
    cancelBorder:     'rgba(255,255,255,0.1)',
    cancelText:       'rgba(255,255,255,0.3)',
    toastInfoBg:      '#0f0f10',
    toastInfoBorder:  'rgba(255,255,255,0.12)',
    toastInfoText:    'rgba(255,255,255,0.8)',
    fontFamily:       "'Inter', system-ui, sans-serif",
    fontSize:         '0.875rem',
    inputBg:          'rgba(255,255,255,0.04)',
    inputBorder:      'rgba(255,255,255,0.1)',
    inputText:        'rgba(255,255,255,0.85)',
    inputFocus:       'rgba(255,255,255,0.5)',
    undoBg:           'rgba(0,200,83,0.07)',
    undoBorder:       'rgba(0,200,83,0.3)',
    undoText:         '#00c853',
    undoProgressBg:   '#00c853',
  },
};

export const getThemeTokens = (theme) => THEMES[theme] ?? THEMES.cyber;
