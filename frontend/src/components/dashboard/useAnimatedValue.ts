import { useState, useRef, useEffect } from 'react';

// ── Animated counter ────────────────────────────────────────────
export function useAnimatedValue(value: number, duration = 900): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef  = useRef<number | null>(null);
  useEffect(() => {
    const from = fromRef.current, to = value;
    if (from === to) return;
    // 0 nigdy nie jest poprawnym uchwytem rAF, więc anulowanie pustego refa jest no-opem.
    cancelAnimationFrame(rafRef.current ?? 0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * e);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current ?? 0);
  }, [value, duration]);
  return display;
}
