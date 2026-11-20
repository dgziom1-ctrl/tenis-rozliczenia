import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { PATH_TO_TAB } from '@/constants';
import { track } from '@/lib/analytics/track';

/** Zdarzenie `page_view` przy każdej zmianie zakładki (nie przy zmianie samych parametrów adresu). */
export function useRouteTracking(): void {
  const { pathname } = useLocation();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === pathname) return;
    track('page_view', {
      tab: PATH_TO_TAB[pathname] ?? 'other',
      from: previous.current ? (PATH_TO_TAB[previous.current] ?? 'other') : undefined,
    });
    previous.current = pathname;
  }, [pathname]);
}
