import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { PATH_TO_TAB } from '@/constants';
import { APP_NAME, PAGE_META } from '@/app/pageMeta';
import type { TabId } from '@/types/ui';

export interface PageTitle {
  tab: TabId;
  /** Krótki tytuł strony, np. „Ranking”. */
  title: string;
  /** Zdanie dla regionu `aria-live` po zmianie zakładki. */
  announced: string;
}

/**
 * Ustawia tytuł dokumentu dla aktywnej zakładki.
 *
 * Router działa po stronie klienta, więc `index.html` ma jeden, wspólny tytuł.
 * Bez tego hooka historia przeglądarki, zakładki i czytnik ekranu pokazywały
 * wszędzie to samo — a użytkownik nie wiedział, czy jest na pulpicie, czy
 * w historii. Tytuł jest jedyną informacją, którą czytnik ogłasza po każdej
 * nawigacji bez dodatkowego regionu live.
 */
export function usePageTitle(): PageTitle {
  const { pathname } = useLocation();
  const tab = PATH_TO_TAB[pathname] ?? 'dashboard';
  const meta = PAGE_META[tab];

  useEffect(() => {
    document.title = `${meta.title} · ${APP_NAME}`;
  }, [meta.title]);

  return { tab, title: meta.title, announced: meta.announced };
}
