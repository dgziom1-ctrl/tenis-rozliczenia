/**
 * STRAŻ STARTU
 *
 * Testujemy plik `public/boot-guard.js` w takiej postaci, w jakiej trafia na
 * serwer — nie jego kopię ani przepisany odpowiednik. To jedyny kod, który
 * działa, gdy paczki aplikacji się nie wczytają, więc musi być pewny.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const GUARD_SOURCE = fs.readFileSync(
  path.resolve(import.meta.dirname, '../../public/boot-guard.js'),
  'utf8',
);

const LEDGER_KEY = 'cp-boot-recovery';
const ORIGIN = 'https://cyber-ponk.web.app';

let guard;
let replace;
let reload;
let listeners;
let deletedCaches;
let unregistered;

/** Podstawia adres strony — jsdom nie umie nawigować i rzuca przy `reload()`. */
function stubLocation(href = `${ORIGIN}/`) {
  replace = vi.fn();
  reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href, origin: ORIGIN, pathname: '/', search: '', hash: '', replace, reload },
  });
}

function stubCaches(keys = ['cp-shell-abc']) {
  deletedCaches = [];
  globalThis.caches = {
    keys: vi.fn().mockResolvedValue(keys),
    delete: vi.fn((key) => {
      deletedCaches.push(key);
      return Promise.resolve(true);
    }),
  };
}

function stubServiceWorker() {
  unregistered = 0;
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistrations: vi.fn().mockResolvedValue([
        { unregister: vi.fn(() => { unregistered += 1; return Promise.resolve(true); }) },
      ]),
    },
  });
}

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

function seedLedger(stage) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify({ stage, at: Date.now() }));
}

function readStage() {
  return JSON.parse(localStorage.getItem(LEDGER_KEY) ?? '{}').stage;
}

/**
 * Ładuje strażnika od zera i zapamiętuje jego nasłuchy.
 *
 * Strażnik trzyma stan startu w domknięciu, więc każdy test potrzebuje świeżej
 * instancji. Bez zdejmowania nasłuchów w `afterEach` instancje z poprzednich
 * testów reagowałyby na te same zdarzenia i psuły liczniki.
 */
function loadGuard() {
  const realAdd = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((type, handler, options) => {
    listeners.push([type, handler, options]);
    realAdd(type, handler, options);
  });

  new Function(GUARD_SOURCE)();
  return window.__cpBoot;
}

beforeEach(() => {
  listeners = [];
  localStorage.clear();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  stubLocation();
  setOnline(true);
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  guard = loadGuard();
});

afterEach(() => {
  for (const [type, handler, options] of listeners) window.removeEventListener(type, handler, options);
  delete globalThis.caches;
  delete window.__cpBoot;
  // jsdom trzyma jedno `navigator` na cały plik, więc podstawiony worker
  // przeciekłby do testów, które celowo go nie mają.
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('rozpoznawanie nieaktualnego builda', () => {
  it.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://app/assets/AdminPage-CX_U.js'],
    ['Firefox', 'error loading dynamically imported module'],
    ['Safari', 'Importing a module script failed.'],
    ['zły typ MIME', "Expected a JavaScript module script but the server responded with a MIME type of 'text/html'"],
    ['webpackowy ChunkLoadError', 'ChunkLoadError: Loading chunk 42 failed'],
    ['HTML podany zamiast skryptu', "Unexpected token '<'"],
  ])('%s: %s', (_label, message) => {
    expect(guard.isStaleBuildError(new Error(message))).toBe(true);
  });

  it('zwykły błąd aplikacji nie uchodzi za nieaktualny build', () => {
    expect(guard.isStaleBuildError(new TypeError('players.map is not a function'))).toBe(false);
    expect(guard.isStaleBuildError('Nie udało się zapisać sesji')).toBe(false);
    expect(guard.isStaleBuildError(null)).toBe(false);
    expect(guard.isStaleBuildError(undefined)).toBe(false);
  });
});

describe('drabinka naprawy', () => {
  it('szczebel 1 pobiera pliki wydania z pominięciem cache i przeładowuje stronę', async () => {
    const script = document.createElement('script');
    script.src = `${ORIGIN}/assets/index-wAzqY5uV.js`;
    document.head.appendChild(script);

    expect(guard.heal('brak paczki')).toBe(true);

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(readStage()).toBe(1);

    // Sedno naprawy: bez `cache: 'reload'` przeglądarka poda ten sam zepsuty
    // wpis, który zapisała sobie na rok.
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${ORIGIN}/assets/index-wAzqY5uV.js`,
      expect.objectContaining({ cache: 'reload' }),
    );
    expect(replace.mock.calls[0][0]).toContain('__cpr=');
  });

  it('szczebel 2 dokłada usunięcie Service Workera i cache', async () => {
    seedLedger(1);
    stubCaches(['cp-shell-abc', 'cp-assets-abc']);
    stubServiceWorker();

    guard.heal('znowu to samo');

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(readStage()).toBe(2);
    expect(deletedCaches).toEqual(['cp-shell-abc', 'cp-assets-abc']);
    expect(unregistered).toBe(1);
  });

  it('szczebel 3 czyści magazyny przeglądarki', async () => {
    seedLedger(2);
    localStorage.setItem('cyber-ponk-theme', 'light');

    guard.heal('nadal nie wstaje');

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(localStorage.getItem('cyber-ponk-theme')).toBeNull();
  });

  // Licznik siedzi w `localStorage`, więc pełne czyszczenie skasowałoby go razem
  // z resztą. Drabinka wracałaby wtedy na pierwszy szczebel po każdym obiegu
  // i przeglądarka przeładowywałaby pustą stronę bez końca, nigdy nie dochodząc
  // do ekranu ratunkowego.
  it('szczebel 3 nie kasuje własnego licznika prób', async () => {
    seedLedger(2);

    guard.heal('nadal nie wstaje');

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(readStage()).toBe(3);
  });

  // Najskuteczniejsze kroki są na końcu łańcucha, więc nieudany krok wcześniejszy
  // nie może ich pominąć — a tryb prywatny i starsze przeglądarki potrafią
  // odmówić dostępu do dowolnego z magazynów.
  it('nieudany krok czyszczenia nie przerywa pozostałych', async () => {
    seedLedger(2);
    localStorage.setItem('cyber-ponk-theme', 'light');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: () => Promise.reject(new Error('SecurityError')) },
    });

    guard.heal('nadal nie wstaje');

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(localStorage.getItem('cyber-ponk-theme')).toBeNull();
  });

  // Bez tego ogranicznika awaria niezależna od cache kręciłaby przeglądarkę
  // w nieskończonej pętli przeładowań.
  it('po wyczerpaniu szczebli pokazuje ekran ratunkowy zamiast przeładowywać', async () => {
    seedLedger(3);

    guard.heal('to nie jest problem z cache');

    await vi.waitFor(() => expect(document.getElementById('cp-rescue')).not.toBeNull());
    expect(replace).not.toHaveBeenCalled();
    expect(document.getElementById('cp-rescue').textContent).toContain('Napraw i uruchom');
  });

  /**
   * Najważniejsza gwarancja całej drabinki: awaria, której nie da się naprawić,
   * kończy się widocznym ekranem, a nie pustą stroną przeładowywaną w kółko.
   * Każde okrążenie pętli to osobne życie strony — licznik przenosi się przez
   * `localStorage`, dokładnie jak przy prawdziwych przeładowaniach.
   */
  it('cztery nieudane starty pod rząd kończą się ekranem ratunkowym, nie pętlą', async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      loadGuard().heal('nie wstaje');
      await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(attempt));
      expect(document.getElementById('cp-rescue')).toBeNull();
    }

    loadGuard().heal('nie wstaje');

    await vi.waitFor(() => expect(document.getElementById('cp-rescue')).not.toBeNull());
    expect(replace).toHaveBeenCalledTimes(3);
  });

  // Offline przeładowanie niczego nie naprawi, a odebrałoby jedyny ekran,
  // na którym da się cokolwiek kliknąć.
  it('bez sieci pokazuje ekran ratunkowy, nie przeładowuje', async () => {
    setOnline(false);

    guard.heal('brak sieci');

    await vi.waitFor(() => expect(document.getElementById('cp-rescue')).not.toBeNull());
    expect(replace).not.toHaveBeenCalled();
    expect(document.getElementById('cp-rescue').textContent).toContain('Brak połączenia');
  });

  /**
   * Gdy aplikacja już działa, pełnoekranowy ekran ratunkowy byłby lekiem gorszym
   * od choroby: zasłoniłby sprawny interfejs z powodu jednej paczki, której nie
   * da się teraz pobrać. Offline to codzienność, a nie awaria startu.
   */
  it('działającej aplikacji nie zasłania ekranem ratunkowym', () => {
    guard.ready();
    setOnline(false);

    expect(guard.heal('paczka zakładki offline')).toBe(false);
    expect(document.getElementById('cp-rescue')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  // Nic nie próbowaliśmy, więc licznik musi zostać nietknięty — inaczej kilka
  // kliknięć offline zużyłoby wszystkie szczeble przed prawdziwą awarią.
  it('nieudana próba offline nie zużywa szczebli drabinki', () => {
    guard.ready();
    setOnline(false);

    guard.heal('paczka zakładki offline');

    expect(guard.stage()).toBe(0);
  });

  /**
   * Kilka uruchomień bez zasięgu (pociąg, winda) nie może zjeść drabinki. Gdyby
   * zjadło, pierwsza prawdziwa awaria po powrocie sieci trafiłaby od razu na
   * ekran ratunkowy z destrukcyjnym czyszczeniem, zamiast na tanie odświeżenie
   * plików, które by wystarczyło.
   */
  it('nieudany start bez sieci nie zużywa szczebli drabinki', async () => {
    setOnline(false);

    guard.heal('start bez zasięgu');

    await vi.waitFor(() => expect(document.getElementById('cp-rescue')).not.toBeNull());
    expect(guard.stage()).toBe(0);
  });

  /**
   * Komunikat „nie udało się pobrać paczki” jest nie do odróżnienia od zwykłego
   * mignięcia sieci, a `navigator.onLine` w tunelu wciąż pokazuje „online”.
   * Dlatego działającej aplikacji wolno najwyżej odświeżyć pliki: chwilowy brak
   * zasięgu nie może skasować ustawień ani pamięci offline użytkownika.
   */
  it('działającej aplikacji wolno tylko odświeżyć pliki i przeładować', async () => {
    stubCaches(['cp-shell-abc']);
    stubServiceWorker();
    localStorage.setItem('cyber-ponk-theme', 'light');
    guard.ready();

    expect(guard.heal('mignięcie sieci')).toBe(true);

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(deletedCaches).toEqual([]);
    expect(unregistered).toBe(0);
    expect(localStorage.getItem('cyber-ponk-theme')).toBe('light');
  });

  // Drugie podejście w tym samym oknie czasowym schodziłoby na szczebel niszczący,
  // a to za dużo za jedną paczkę w apce, która przecież działa.
  it('działającej aplikacji nie schodzi poniżej pierwszego szczebla', () => {
    seedLedger(1);
    stubCaches(['cp-shell-abc']);
    stubServiceWorker();
    guard.ready();

    expect(guard.heal('znowu to samo')).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(deletedCaches).toEqual([]);
    expect(guard.stage()).toBe(1);
  });

  /**
   * Paczka zakładki nie jest wypisana w dokumencie, więc `ownResourceUrls()` jej
   * nie zna. Bez wyłuskania adresu z treści błędu jej zatruty wpis w cache
   * przeżyłby przeładowanie i awaria wracałaby po każdym wejściu w tę zakładkę.
   */
  it('odświeża także paczkę, której adres jest tylko w treści błędu', async () => {
    const chunk = `${ORIGIN}/assets/AdminPage-CX_U.js`;

    guard.heal(new Error(`Failed to fetch dynamically imported module: ${chunk}`));

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(globalThis.fetch).toHaveBeenCalledWith(chunk, expect.objectContaining({ cache: 'reload' }));
  });

  it('licznik prób z poprzedniej doby nie blokuje ratunku', async () => {
    localStorage.setItem(LEDGER_KEY, JSON.stringify({ stage: 3, at: Date.now() - 24 * 3600 * 1000 }));

    guard.heal('nowa awaria');

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(readStage()).toBe(1);
  });

  // Paczka zakładki potrafi nie doładować się długo po tym, jak apka wstała —
  // wtedy naprawa jest równie potrzebna jak przy starcie.
  it('naprawia także po udanym starcie', async () => {
    guard.ready();

    expect(guard.heal('paczka zakładki nie doszła')).toBe(true);
    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it('naprawia najwyżej raz na jedno życie strony', () => {
    expect(guard.heal('pierwszy błąd')).toBe(true);
    expect(guard.heal('drugi błąd')).toBe(false);
  });
});

describe('czuwanie nad startem', () => {
  it('przeładowuje stronę, gdy aplikacja nigdy nie zgłosi gotowości', async () => {
    vi.useFakeTimers();
    const freshGuard = loadGuard();
    expect(freshGuard).toBeDefined();

    await vi.advanceTimersByTimeAsync(20_000);
    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it('nie rusza strony, gdy aplikacja zgłosi gotowość', async () => {
    vi.useFakeTimers();
    loadGuard().ready();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(replace).not.toHaveBeenCalled();
  });

  // Gdyby udany start zerował licznik, awaria wychodząca dopiero przy wejściu
  // w osobno doładowywaną zakładkę zaczynałaby drabinkę od zera i przeglądarka
  // przeładowywałaby stronę bez końca.
  it('licznik prób przeżywa udany start', async () => {
    vi.useFakeTimers();
    seedLedger(2);

    loadGuard().ready();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(readStage()).toBe(2);
  });
});

describe('globalny nasłuch', () => {
  it('reaguje na odrzuconą obietnicę z importu paczki', async () => {
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), {
      reason: new Error('Failed to fetch dynamically imported module: /assets/HistoryPage-Wfq.js'),
    }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it('ignoruje zwykły błąd aplikacji', () => {
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), {
      reason: new Error('Firebase: permission denied'),
    }));

    expect(replace).not.toHaveBeenCalled();
  });

  // Zablokowany font z Google nie znaczy, że wyszła nowa wersja — inaczej brak
  // sieci przeładowywałby stronę w kółko.
  it('ignoruje nieudany zasób z obcego serwera', () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue';
    document.head.appendChild(link);
    link.dispatchEvent(new Event('error', { bubbles: false }));

    expect(replace).not.toHaveBeenCalled();
  });

  it('reaguje na nieudany skrypt z własnego serwera', async () => {
    const script = document.createElement('script');
    script.src = `${ORIGIN}/assets/index-wAzqY5uV.js`;
    document.head.appendChild(script);
    script.dispatchEvent(new Event('error', { bubbles: false }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
  });
});

describe('ekran ratunkowy', () => {
  /**
   * Offline czyszczenie danych jest najgorszym możliwym ruchem: usuwa zapisaną
   * kopię offline, a przeładowanie nie ma jej skąd odtworzyć — użytkownik traci
   * nawet ten jeden ekran, na którym dało się cokolwiek kliknąć. Przycisk mówi
   * „spróbuj ponownie” i dokładnie tyle ma robić.
   */
  it('bez sieci tylko ponawia, nie czyszcząc pamięci offline', async () => {
    stubCaches(['cp-shell-abc']);
    stubServiceWorker();
    localStorage.setItem('cyber-ponk-theme', 'light');
    setOnline(false);

    guard.heal('start bez zasięgu');
    await vi.waitFor(() => expect(document.getElementById('cp-rescue')).not.toBeNull());

    document.querySelector('#cp-rescue button').click();

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(deletedCaches).toEqual([]);
    expect(unregistered).toBe(0);
    expect(localStorage.getItem('cyber-ponk-theme')).toBe('light');
  });

  it('z siecią czyści wszystko, bo to ostatnia deska ratunku', async () => {
    stubCaches(['cp-shell-abc']);
    stubServiceWorker();
    localStorage.setItem('cyber-ponk-theme', 'light');
    seedLedger(3);

    guard.heal('nic nie pomogło');
    await vi.waitFor(() => expect(document.getElementById('cp-rescue')).not.toBeNull());

    document.querySelector('#cp-rescue button').click();

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(deletedCaches).toEqual(['cp-shell-abc']);
    expect(unregistered).toBe(1);
    expect(localStorage.getItem('cyber-ponk-theme')).toBeNull();
  });
});

describe('pełne czyszczenie na żądanie', () => {
  it('usuwa worker, cache i magazyny, a potem przeładowuje', async () => {
    stubCaches(['cp-shell-abc']);
    stubServiceWorker();
    localStorage.setItem('cyber-ponk-theme', 'light');

    guard.hardReset();

    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    expect(deletedCaches).toEqual(['cp-shell-abc']);
    expect(unregistered).toBe(1);
    expect(localStorage.getItem('cyber-ponk-theme')).toBeNull();
  });
});
