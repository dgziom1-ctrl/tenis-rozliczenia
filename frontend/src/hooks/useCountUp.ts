import { useState, useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Licznik narastający od zera do `target` (easeOutCubic). Przy ograniczonym
 * ruchu systemu pokazuje wartość docelową od razu.
 */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) { setValue(target); return undefined; }
    const isFloat = target % 1 !== 0;
    const steps = Math.min(Math.ceil(duration / 16), 80);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = 1 - Math.pow(1 - step / steps, 3);          // easeOutCubic
      const v = progress * target;
      setValue(isFloat ? Math.round(v * 10) / 10 : Math.round(v));
      if (step >= steps) { setValue(target); clearInterval(timer); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration, reducedMotion]);
  return value;
}
