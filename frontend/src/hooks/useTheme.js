import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cyber-pong-theme';
const WIPE_MS     = 520;

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; } catch { return 'dark'; }
  });

  // prevColor: kolor tła poprzedniego motywu — overlay który znika
  const [wipeColor, setWipeColor] = useState(null);

  useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';

    // Zapamiętaj kolor STAREGO motywu — to będzie overlay który znika
    const oldBg = theme === 'dark' ? '#030508' : '#F2F5F9';

    // 1. Zmień motyw natychmiast — content już jest w nowym motywie
    setTheme(next);

    // 2. Nałóż overlay w starym kolorze i zacznij animację chowania od dołu
    setWipeColor(oldBg);

    // 3. Po zakończeniu animacji usuń overlay
    setTimeout(() => setWipeColor(null), WIPE_MS);
  }, [theme]);

  return { theme, toggle, wipeColor };
}
