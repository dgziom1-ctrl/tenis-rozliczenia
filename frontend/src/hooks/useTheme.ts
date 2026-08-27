import { useState, useEffect, useRef, useCallback } from 'react';
import type { Theme } from '@/types/ui';

const STORAGE_KEY = 'cyber-ponk-theme';

/** Musi odpowiadać `transition-duration` reguły `body.theme-switching` w index.css. */
const THEME_TRANSITION_MS = 400;

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'; } catch { return 'dark'; }
  });

  const isFirstRun = useRef(true);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* prywatny tryb przeglądarki */ }

    // Interpolacja kolorów jest włączona tylko na czas przejścia. Trzymana na
    // stałe (tak było wcześniej) dawała 400 ms opóźnienia każdemu hoverowi
    // w aplikacji. Pierwsze uruchomienie pomijamy, żeby motyw zapisany
    // w localStorage nie przepływał w kadrze przy wejściu na stronę.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return undefined;
    }

    document.body.classList.add('theme-switching');
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => {
      document.body.classList.remove('theme-switching');
    }, THEME_TRANSITION_MS);

    return () => { if (switchTimer.current) clearTimeout(switchTimer.current); };
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggle };
}
