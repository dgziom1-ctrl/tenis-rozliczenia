import { DEMO_MODE } from '@/constants';
import { collectDeviceProps, collectTimingProps } from './device';
import { isStatsPath } from './statsRoute';
import { enableTracking, flush, track } from './track';

export { track, flush, isTracking } from './track';
export { setAnalyticsPlayer } from './identity';

const HEARTBEAT_MS = 60_000;
const MAX_ERRORS_PER_SESSION = 20;

let started = false;

function shortSource(file: string | undefined, line: number | undefined): string | undefined {
  if (!file) return undefined;
  const base = file.split('?')[0].split('/').pop() ?? '';
  return line ? `${base}:${line}` : base;
}

/**
 * Uruchamia zbieranie statystyk dla całej aplikacji (wołane raz z `main.tsx`).
 *
 * Aktywne tylko w buildzie produkcyjnym, poza trybem demo, poza panelem
 * statystyk i poza przeglądarkami sterowanymi automatem (testy, boty).
 */
export function startAnalytics(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  const allowed = import.meta.env.PROD
    && !DEMO_MODE
    && !isStatsPath(window.location.pathname)
    && !navigator.webdriver;
  if (!enableTracking({ allowed })) return;

  track('app_start', { ...collectDeviceProps(), path: window.location.pathname });

  // Czasy ładowania znamy dopiero po zdarzeniu `load`.
  const sendTimings = () => setTimeout(() => track('perf', collectTimingProps()), 0);
  if (document.readyState === 'complete') sendTimings();
  else window.addEventListener('load', sendTimings, { once: true });

  // Czas aktywności = suma okresów, w których karta była widoczna.
  let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
  let activeMs = 0;
  const stopClock = () => {
    if (visibleSince !== null) { activeMs += Date.now() - visibleSince; visibleSince = null; }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopClock();
      track('app_hidden', { active_s: Math.round(activeMs / 1000) });
      void flush();
    } else {
      visibleSince = Date.now();
      track('app_visible');
    }
  });
  window.addEventListener('pagehide', () => {
    stopClock();
    track('session_end', { active_s: Math.round(activeMs / 1000) });
    void flush();
  });

  setInterval(() => {
    if (document.visibilityState === 'visible') track('heartbeat', { active_s: Math.round((activeMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000) });
  }, HEARTBEAT_MS);

  let errors = 0;
  window.addEventListener('error', (event) => {
    // Błędy ładowania zasobów (img/script) nie mają `message` — wyłapuje je boot-guard.
    if (!(event instanceof ErrorEvent) || errors >= MAX_ERRORS_PER_SESSION) return;
    errors += 1;
    track('js_error', { msg: event.message, src: shortSource(event.filename, event.lineno) });
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (errors >= MAX_ERRORS_PER_SESSION) return;
    errors += 1;
    const reason: unknown = event.reason;
    const msg = reason instanceof Error ? reason.message : (typeof reason === 'string' ? reason : undefined);
    track('js_rejection', { msg });
  });

  window.addEventListener('online', () => track('network', { state: 'online' }));
  window.addEventListener('offline', () => track('network', { state: 'offline' }));
  window.addEventListener('appinstalled', () => track('pwa_installed'));
}
