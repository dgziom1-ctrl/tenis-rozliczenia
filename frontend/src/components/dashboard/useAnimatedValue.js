import { useState, useRef, useEffect } from 'react';

// ── Animated counter ────────────────────────────────────────────
export function useAnimatedValue(value, duration = 900) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef  = useRef(null);
  useEffect(() => {
    const from = fromRef.current, to = value;
    if (from === to) return;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * e);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}
