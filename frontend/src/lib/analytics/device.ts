import { APP_BUILD } from '@/utils/buildVersion';
import type { EventProps } from './track';

/** Grube rozpoznanie systemu i przeglądarki z user agenta — bez wersji, które identyfikują zbyt dokładnie. */
export function parseUserAgent(ua: string): { os: string; browser: string; model?: string } {
  let os = 'inny';
  if (/Android/i.test(ua)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'ios';
  else if (/Windows/i.test(ua)) os = 'windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macos';
  else if (/Linux|X11/i.test(ua)) os = 'linux';

  let browser = 'inna';
  if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
  else if (/Edg\//i.test(ua)) browser = 'edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'opera';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'firefox';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'chrome';
  else if (/Safari/i.test(ua)) browser = 'safari';

  // Android podaje model w UA („; SM-G991B Build/…”) — przydaje się, by odróżnić telefony graczy.
  const model = /Android[^;]*;\s*([^;)]+?)(?:\s+Build|\))/i.exec(ua)?.[1]?.trim();
  return { os, browser, ...(model ? { model: model.slice(0, 30) } : {}) };
}

function isStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return Boolean(nav.standalone) || window.matchMedia?.('(display-mode: standalone)').matches === true;
  } catch {
    return false;
  }
}

/** Opis urządzenia i kontekstu uruchomienia — wysyłany raz przy starcie aplikacji. */
export function collectDeviceProps(): EventProps {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
    deviceMemory?: number;
  };
  const { os, browser, model } = parseUserAgent(navigator.userAgent ?? '');
  return {
    os,
    browser,
    model,
    pwa: isStandalone(),
    screen: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
    dpr: window.devicePixelRatio,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    net: nav.connection?.effectiveType,
    saveData: nav.connection?.saveData,
    mem: nav.deviceMemory,
    build: APP_BUILD,
    sw: 'serviceWorker' in navigator,
    online: navigator.onLine,
  };
}

/** Czasy ładowania (ms) z Navigation Timing i Paint Timing, o ile przeglądarka je zna. */
export function collectTimingProps(): EventProps {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return {
      ttfb: nav ? Math.round(nav.responseStart) : undefined,
      dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : undefined,
      load: nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : undefined,
      fcp: fcp ? Math.round(fcp.startTime) : undefined,
      navType: nav?.type,
    };
  } catch {
    return {};
  }
}
