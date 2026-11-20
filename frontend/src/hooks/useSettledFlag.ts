import { useEffect, useState } from 'react';

/**
 * Zwraca `true` dopiero wtedy, gdy `active` utrzymuje się nieprzerwanie przez
 * `delayMs`. Powrót do `false` gasi flagę natychmiast.
 *
 * Po co: połączenie z bazą na starcie aplikacji ma stan „brak”, zanim SDK
 * zdąży zestawić łącze. Pokazywanie od razu komunikatu „brak połączenia”
 * skutkowało błyskiem baneru przy każdym wejściu do apki i wyglądało na błąd.
 * Podobnie krótkie mignięcie sieci nie powinno straszyć użytkownika.
 */
export function useSettledFlag(active: boolean, delayMs: number): boolean {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!active) {
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return active && settled;
}
