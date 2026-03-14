import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ponk-theme';
const DEFAULT_THEME = 'cyber';

function safeGetStoredTheme() {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

function applyThemeToDom(theme) {
  document.body.classList.toggle('theme-arcade-bg', theme === 'arcade');
  document.body.classList.toggle('theme-zen-bg',    theme === 'zen');
  // Drives CSS selectors in index.css (Navigation, etc.)
  document.documentElement.dataset.theme = theme === DEFAULT_THEME ? '' : theme;
}

/**
 * Manages theme selection with localStorage persistence.
 * Returns [theme, setTheme] — call setTheme to cycle or jump to a specific value.
 * DOM classes and data-theme are kept in sync automatically.
 */
export function usePersistedTheme() {
  const [theme, setTheme] = useState(safeGetStoredTheme);

  // Sync DOM on initial mount
  useEffect(() => { applyThemeToDom(safeGetStoredTheme()); }, []);

  const persistTheme = useCallback((next) => {
    setTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    applyThemeToDom(next);
  }, []);

  return [theme, persistTheme];
}
