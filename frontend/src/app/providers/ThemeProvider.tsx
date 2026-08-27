import { useMemo, type ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeContext, type ThemeContextValue } from './themeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();

  const value = useMemo<ThemeContextValue>(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
