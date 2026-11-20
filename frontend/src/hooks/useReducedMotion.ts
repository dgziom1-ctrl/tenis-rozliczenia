import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPreference(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(QUERY).matches;
}

/** Reaktywnie udostępnia ustawienie ruchu systemu również dla animacji rAF. */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(readPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia(QUERY);
    const update = () => setReducedMotion(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    // Safari przed obsługą EventTarget na MediaQueryList.
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reducedMotion;
}
