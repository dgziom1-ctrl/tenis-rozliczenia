import { useState, useRef, useCallback, useEffect } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Tryb edycji wpłat na karcie: pięć kliknięć w kwotę w ciągu sekundy albo
 * Enter/Spacja na kwocie (kwota ma rolę przycisku z `aria-pressed`).
 */
export function useAdminModeToggle() {
  const [adminMode, setAdminMode] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleAdminMode = useCallback(() => {
    clickCount.current = 0;
    clearTimeout(clickTimer.current ?? undefined);
    setAdminMode(prev => !prev);
  }, []);

  const handleAmountClick = useCallback(() => {
    clickCount.current += 1;
    clearTimeout(clickTimer.current ?? undefined);
    if (clickCount.current >= 5) toggleAdminMode();
    else clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1000);
  }, [toggleAdminMode]);

  // Ukryte 5 kliknięć było niedostępne z klawiatury. Kwota ma teraz rolę
  // przycisku i `aria-pressed`; Enter/Spacja przełącza tryb od razu, bez
  // zmuszania użytkownika czytnika ekranu do pięciu osobnych aktywacji.
  const handleAmountKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleAdminMode();
  }, [toggleAdminMode]);

  useEffect(() => () => clearTimeout(clickTimer.current ?? undefined), []);

  return { adminMode, toggleAdminMode, handleAmountClick, handleAmountKeyDown };
}
