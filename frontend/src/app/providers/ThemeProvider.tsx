import { useMemo, type ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeContext, getThemeTokens, type ThemeContextValue } from './themeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, tokens: getThemeTokens(theme), toggle }),
    [theme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
