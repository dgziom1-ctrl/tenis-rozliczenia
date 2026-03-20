import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cyber-pong-theme';

// Czas animacji wipu w ms — musi odpowiadać CSS @keyframes wipe-curtain
const WIPE_MS = 600;

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; } catch { return 'dark'; }
  });

  // wipe: null | 'to-light' | 'to-dark'
  const [wipe, setWipe] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';

    // 1. Uruchom animację kurtyny
    setWipe(`to-${next}`);

    // 2. Przełącz motyw w połowie animacji — gdy kurtyna zasłania ekran
    setTimeout(() => {
      setTheme(next);
    }, WIPE_MS * 0.42);

    // 3. Zakończ animację
    setTimeout(() => {
      setWipe(null);
    }, WIPE_MS);
  }, [theme]);

  return { theme, toggle, wipe };
}
