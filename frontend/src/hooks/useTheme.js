import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cyber-pong-theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggle };
}
