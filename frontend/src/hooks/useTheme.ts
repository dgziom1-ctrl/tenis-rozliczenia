import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { Theme } from '@/types/ui';

const STORAGE_KEY = 'cyber-ponk-theme';

/** Musi odpowiadać `transition-duration` reguły `body.theme-switching` w index.css. */
const THEME_TRANSITION_MS = 400;

/**
 * Kolor paska przeglądarki/statusu. Musi odpowiadać `--co-void` obu motywów —
 * inaczej na telefonie nad ciemną aplikacją świeci jasny pasek (albo odwrotnie)
 * i wygląda to jak niedokończona aplikacja. `index.html` ma wartość ciemną,
 * bo taki motyw startuje domyślnie; JS przełącza ją razem z motywem.
 */
const THEME_COLOR: Record<Theme, string> = { dark: '#030508', light: '#F8FAFC' };

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function useTheme() {
  const [preference, setPreference] = useState(() => {
    const saved = readSavedTheme();
    return { theme: saved ?? readSystemTheme(), hasExplicitChoice: saved !== null };
  });
  const { theme } = preference;

  const previousTheme = useRef(theme);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zastosuj systemowy motyw przed pierwszym malowaniem, bez zapisywania go jako
  // świadomego wyboru. Dzięki temu następne uruchomienie nadal może podążyć za OS.
  useLayoutEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);

    const themeChanged = previousTheme.current !== theme;
    previousTheme.current = theme;
    if (!themeChanged) return undefined;

    document.body.classList.add('theme-switching');
    if (switchTimer.current) clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => {
      document.body.classList.remove('theme-switching');
    }, THEME_TRANSITION_MS);

    return () => { if (switchTimer.current) clearTimeout(switchTimer.current); };
  }, [theme]);

  // Dopóki użytkownik sam nie przełączy motywu, reagujemy na zmianę ustawień
  // systemowych. Po pierwszym świadomym wyborze localStorage staje się źródłem prawdy.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const syncWithSystem = () => {
      setPreference(current => current.hasExplicitChoice
        ? current
        : { ...current, theme: media.matches ? 'light' : 'dark' });
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncWithSystem);
      return () => media.removeEventListener('change', syncWithSystem);
    }

    media.addListener(syncWithSystem);
    return () => media.removeListener(syncWithSystem);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* prywatny tryb przeglądarki */ }
    setPreference({ theme: next, hasExplicitChoice: true });
  }, [theme]);

  return { theme, toggle };
}
