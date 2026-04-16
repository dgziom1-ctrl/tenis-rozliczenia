import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Theme, ThemeTokens } from '@/types/ui';

const STORAGE_KEY = 'cyber-ponk-theme';

const CYBER_TOKENS: ThemeTokens = {
  confirmBg: 'var(--co-cyan)',
  confirmBorder: 'var(--co-cyan)',
  confirmText: '#030508',
  accentBorder: 'rgba(0,229,255,0.35)',
  accentText: 'var(--co-cyan)',
  accentBg: 'rgba(0,229,255,0.05)',
  accentColor: 'var(--co-cyan)',
  cancelBorder: 'var(--co-border)',
  cancelText: 'var(--co-dim)',
  overlayBg: 'rgba(0,0,0,0.95)',
  modalBg: '#060C12',
  modalRadius: '0px',
  modalShadow: '0 0 40px rgba(0,229,255,0.12), 0 2px 40px rgba(0,0,0,0.95)',
  inputBg: '#030508',
  inputBorder: 'var(--co-border-hi)',
  inputText: 'var(--co-text-hi)',
  cellBg: '#060C12',
  cellBorder: 'var(--co-border)',
  cellLabelText: 'var(--co-dim)',
  bodyText: 'var(--co-text)',
  mutedText: 'var(--co-dim)',
  undoBg: '#060C12',
  undoBorder: 'rgba(0,229,255,0.22)',
  undoText: 'var(--co-text)',
  undoProgressBg: 'var(--co-cyan)',
  fontFamily: "'Bebas Neue', monospace",
  fontSize: '0.9rem',
};

const LIGHT_TOKENS: ThemeTokens = {
  confirmBg: '#0D9488',
  confirmBorder: '#0D9488',
  confirmText: '#ffffff',
  accentBorder: 'rgba(13,148,136,0.3)',
  accentText: '#0F766E',
  accentBg: 'rgba(13,148,136,0.06)',
  accentColor: '#0D9488',
  cancelBorder: '#CBD5E1',
  cancelText: '#64748B',
  overlayBg: 'rgba(15,23,42,0.45)',
  modalBg: '#ffffff',
  modalRadius: '12px',
  modalShadow: '0 4px 24px rgba(0,0,0,0.12)',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  inputText: '#0F172A',
  cellBg: '#F8FAFC',
  cellBorder: '#E2E8F0',
  cellLabelText: '#64748B',
  bodyText: '#334155',
  mutedText: '#94A3B8',
  undoBg: '#ffffff',
  undoBorder: 'rgba(13,148,136,0.25)',
  undoText: '#334155',
  undoProgressBg: '#0D9488',
  fontFamily: "'Bebas Neue', monospace",
  fontSize: '0.9rem',
};

interface ThemeContextValue {
  theme: Theme;
  tokens: ThemeTokens;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  tokens: CYBER_TOKENS,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  const tokens = theme === 'light' ? LIGHT_TOKENS : CYBER_TOKENS;

  return (
    <ThemeContext.Provider value={{ theme, tokens, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function useThemeTokens(): ThemeTokens {
  return useContext(ThemeContext).tokens;
}

export { CYBER_TOKENS, LIGHT_TOKENS };
