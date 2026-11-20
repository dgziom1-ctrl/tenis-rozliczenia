import { createContext, useContext } from 'react';
import type { Theme } from '@/types/ui';

/**
 * Kontekst motywu trzyma już tylko sam motyw i przełącznik.
 *
 * Wcześniej mieszkał tu równoległy system tokenów — 27 pól × 2 motywy, czyli
 * 54 wartości dublujące zmienne CSS z index.css. Realnie czytane były cztery,
 * wszystkie przez `UndoBar`; pozostałe 23 (m.in. `overlayBg`, `modalBg`,
 * `modalRadius`, `modalShadow`, zaprojektowane dokładnie po to, żeby modale
 * były spójne) nie były używane nigdzie. Jedno źródło prawdy jest teraz w CSS,
 * bo tylko ono działa też dla stylów, których React nie dotyka.
 */

export interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
});

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
