import { useEffect, useRef, useState } from 'react';

/**
 * Szerokość elementu w pikselach CSS.
 *
 * Wykresy SVG miały stały `viewBox` 560 px i skalowały się razem z tekstem —
 * na telefonie etykiety schodziły do 7–8 px. Pomiar pozwala ustawić viewBox
 * 1:1 z kontenerem, więc `fontSize` w SVG jest tym samym rozmiarem, który
 * widzi użytkownik.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 560) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
