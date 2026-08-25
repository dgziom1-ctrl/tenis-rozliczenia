/**
 * SAMONAPRAWA PO WDROŻENIU
 *
 * Po pushu przeglądarka potrafi podać z cache stary `index.html`, który wskazuje
 * paczki usunięte przez nowy build. Aplikacja ma się z tego pozbierać sama —
 * bez czyszczenia danych przeglądarki i bez trybu incognito.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isStaleBuildError,
  canRecoverFromStaleBuild,
  recoverFromStaleBuild,
  installStaleBuildRecovery,
} from '../utils/staleBuild';

const reload = vi.fn();

beforeEach(() => {
  reload.mockClear();
  sessionStorage.clear();
  // jsdom nie umie przeładować strony — podmieniamy samo `reload`. `origin`
  // podajemy wprost, bo w Location jest akcesorem z prototypu i sam by nie przeszedł.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: Object.assign(Object.create(null), window.location, {
      reload,
      href: 'https://cyber-ponk.web.app/',
      origin: 'https://cyber-ponk.web.app',
    }),
  });
});

afterEach(() => { vi.restoreAllMocks(); });

describe('rozpoznawanie nieaktualnego builda', () => {
  it.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://app/assets/AdminPage-CX_U.js'],
    ['Firefox', 'error loading dynamically imported module'],
    ['Safari', 'Importing a module script failed.'],
    ['zły typ MIME', "Expected a JavaScript module script but the server responded with a MIME type of 'text/html'"],
    ['webpackowy ChunkLoadError', 'ChunkLoadError: Loading chunk 42 failed'],
    ['HTML podany zamiast skryptu', "Unexpected token '<'"],
  ])('%s: %s', (_label, message) => {
    expect(isStaleBuildError(new Error(message))).toBe(true);
  });

  it('zwykły błąd aplikacji nie uchodzi za nieaktualny build', () => {
    expect(isStaleBuildError(new TypeError('players.map is not a function'))).toBe(false);
    expect(isStaleBuildError('Nie udało się zapisać sesji')).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
  });
});

describe('przeładowanie ratunkowe', () => {
  it('przeładowuje stronę przy pierwszym wystąpieniu', async () => {
    expect(recoverFromStaleBuild()).toBe(true);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  // Gdyby świeży start znów kończył się tym samym błędem, kolejne przeładowania
  // zapętliłyby przeglądarkę zamiast cokolwiek naprawić.
  it('nie wpada w pętlę, gdy przeładowanie nie pomogło', async () => {
    recoverFromStaleBuild();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    expect(canRecoverFromStaleBuild()).toBe(false);
    expect(recoverFromStaleBuild()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('czyści Cache Storage, gdy został po starszym Service Workerze', async () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    globalThis.caches = { keys: vi.fn().mockResolvedValue(['stary-precache']), delete: deleteCache };

    recoverFromStaleBuild();

    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(deleteCache).toHaveBeenCalledWith('stary-precache');
    delete globalThis.caches;
  });
});

describe('globalny nasłuch', () => {
  it('reaguje na odrzuconą obietnicę z importu paczki', async () => {
    installStaleBuildRecovery();

    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), {
      reason: new Error('Failed to fetch dynamically imported module: /assets/HistoryPage-Wfq.js'),
    }));

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('ignoruje zwykły błąd aplikacji', () => {
    installStaleBuildRecovery();

    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), {
      reason: new Error('Firebase: permission denied'),
    }));

    expect(reload).not.toHaveBeenCalled();
  });

  // Zablokowany font z Google nie znaczy, że wyszła nowa wersja — inaczej brak
  // sieci przeładowywałby stronę w kółko.
  it('ignoruje nieudany zasób z obcego serwera', () => {
    installStaleBuildRecovery();

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue';
    document.head.appendChild(link);
    link.dispatchEvent(new Event('error', { bubbles: false }));

    expect(reload).not.toHaveBeenCalled();
    link.remove();
  });

  it('reaguje na nieudany skrypt z własnego serwera', async () => {
    installStaleBuildRecovery();

    const script = document.createElement('script');
    script.src = 'https://cyber-ponk.web.app/assets/index-wAzqY5uV.js';
    document.head.appendChild(script);
    script.dispatchEvent(new Event('error', { bubbles: false }));

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    script.remove();
  });
});
