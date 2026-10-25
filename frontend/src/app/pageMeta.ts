import { TABS } from '@/constants';
import type { TabId } from '@/types/ui';

/** Nazwa produktu używana w `document.title` i w nagłówku karty przeglądarki. */
export const APP_NAME = 'Cyber-Ponk';

/**
 * Tytuły stron i opisy dla czytników ekranu.
 *
 * SPA nie zmienia adresu dokumentu, więc bez tej mapy każda zakładka miała ten
 * sam tytuł „Cyber-Ponk”. Dla osoby z czytnikiem ekranu (albo z dziesięcioma
 * kartami otwartymi w przeglądarce) nie było sposobu rozpoznać, gdzie jest —
 * WCAG 2.4.2 wymaga, żeby każda strona miała opisowy tytuł. Wpis musi istnieć
 * dla każdego klucza `TAB_PATHS`; pilnuje tego test `pageMeta.test.js`.
 */
export const PAGE_META: Record<TabId, { title: string; announced: string }> = {
  [TABS.DASHBOARD]:  { title: 'Pulpit',        announced: 'Pulpit — salda i sesje' },
  [TABS.ATTENDANCE]: { title: 'Ranking',       announced: 'Ranking — frekwencja i podium' },
  [TABS.ADMIN]:      { title: 'Dodaj sesję',   announced: 'Dodaj sesję — nowy wpis rozliczenia' },
  [TABS.HISTORY]:    { title: 'Historia',      announced: 'Historia — wszystkie sesje' },
  [TABS.PLAYERS]:    { title: 'Gracze',        announced: 'Gracze — lista i skład drużyny' },
};
