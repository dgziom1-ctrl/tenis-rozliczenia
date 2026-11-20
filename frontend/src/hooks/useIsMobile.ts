import { useSyncExternalStore } from 'react';
import { BREAKPOINT } from '@/constants/styles';

export function useIsMobile(breakpoint: number = BREAKPOINT.mobile): boolean {
  const query = `(max-width: ${breakpoint}px)`;
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
