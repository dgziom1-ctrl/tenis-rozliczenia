import { useState, useRef, useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── Animated counter ────────────────────────────────────────────
export function useAnimatedValue(value: number, duration = 450): number {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const to = value;
    const from = displayRef.current;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Ustawienie systemowe zastępuje liczenie ruchem bezpośrednią aktualizacją,
    // zamiast zostawiać licznik w połowie poprzedniej wartości.
    if (reducedMotion || from === to || duration <= 0) {
      displayRef.current = to;
      setDisplay(to);
      return undefined;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      // To jest wartość prezentowana, a nie ostatni cel ukończonej animacji.
      // Nowy cel w trakcie ruchu musi kontynuować dokładnie z tego miejsca.
      displayRef.current = next;
      setDisplay(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        displayRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [value, duration, reducedMotion]);

  return display;
}
