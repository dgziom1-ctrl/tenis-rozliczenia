import { useState, useEffect, useCallback } from 'react';
import type { Theme } from '@/types/ui';

const STORAGE_KEY = 'cyber-pong-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* */ }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggle };
}
