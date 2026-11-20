/**
 * WYJŚCIE ZE STAREGO WYDANIA
 *
 * Zgłoszona awaria: po wdrożeniu poprawki telefon dalej uruchamiał poprzednią,
 * zepsutą wersję. Service Worker miał w pamięci komplet plików tamtego wydania —
 * powłokę i jej paczki — więc aplikacja startowała z nich przy każdym otwarciu,
 * także po zamknięciu apki. Pomagało wyłącznie wyczyszczenie danych przeglądarki.
 *
 * Ten nadzór jest niezależny od workera: porównuje wydanie, na którym działa kod,
 * z tym wystawionym przez serwer, i sam się z zacięcia wyprowadza.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ATTEMPT_KEY = 'cp-forced-update-at';

let reload;
let unregistered;
let deletedCaches;

function stubLocation() {
  reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'https://app.test/', origin: 'https://app.test', reload },
  });
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

function stubCaches() {
  deletedCaches = [];
  globalThis.caches = {
    keys: vi.fn().mockResolvedValue(['cp-shell-stare', 'cp-assets-stare']),
    delete: vi.fn((key) => { deletedCaches.push(key); return Promise.resolve(true); }),
  };
}

/** Serwer odpowiada podanym wydaniem (albo błędem, gdy `null`). */
function serveVersion(buildId) {
  globalThis.fetch = vi.fn((url) => {
    if (String(url).includes('version.json')) {
      return buildId === null
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ buildId }) });
    }
    return Promise.resolve({ ok: true });
  });
}

/** Świeża instancja modułu — trzyma odstęp między sprawdzeniami w domknięciu. */
async function loadModule() {
  vi.resetModules();
  return import('../utils/buildVersion');
}

beforeEach(() => {
  localStorage.clear();
  stubLocation();
  stubServiceWorker();
  stubCaches();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  delete globalThis.caches;
  delete globalThis.fetch;
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.restoreAllMocks();
});

describe('rozpoznanie starego wydania', () => {
  /**
   * Sedno naprawy: aplikacja sama usuwa workera i jego cache, czyli robi to,
   * co dotąd trzeba było robić ręcznie w ustawieniach przeglądarki. Danych
   * użytkownika nie tyka — to wymiana wersji, nie czyszczenie aplikacji.
   */
  it('wymienia wydanie, gdy serwer ma inne', async () => {
    serveVersion('inne-wydanie-z-serwera');
    localStorage.setItem('cyber-ponk-theme', 'light');
    const { checkAppVersion } = await loadModule();

    await checkAppVersion();

    expect(reload).toHaveBeenCalled();
    expect(unregistered).toBe(1);
    expect(deletedCaches).toEqual(['cp-shell-stare', 'cp-assets-stare']);
    expect(localStorage.getItem('cyber-ponk-theme')).toBe('light');
  });

  // Ten sam identyfikator znaczy, że wszystko jest w porządku — nie wolno
  // przeładowywać strony bez powodu.
  it('nie rusza strony, gdy wydanie się zgadza', async () => {
    const { checkAppVersion, APP_BUILD } = await loadModule();
    serveVersion(APP_BUILD);

    await checkAppVersion();

    expect(reload).not.toHaveBeenCalled();
    expect(unregistered).toBe(0);
  });

  it('bez odpowiedzi serwera nic nie robi', async () => {
    serveVersion(null);
    const { checkAppVersion } = await loadModule();

    await checkAppVersion();

    expect(reload).not.toHaveBeenCalled();
    expect(deletedCaches).toEqual([]);
  });

  it('uszkodzona odpowiedź nie jest podstawą do działania', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const { checkAppVersion } = await loadModule();

    await checkAppVersion();

    expect(reload).not.toHaveBeenCalled();
  });

  /**
   * Gdyby rozjazdu nie dało się naprawić (serwer wystawia inny identyfikator,
   * niż faktycznie serwuje), bez tej blokady strona przeładowywałaby się bez
   * końca — powstałaby awaria dokładnie tej klasy, którą naprawiamy.
   */
  it('nie wpada w pętlę, gdy wymiana nie pomogła', async () => {
    localStorage.setItem(ATTEMPT_KEY, String(Date.now()));
    serveVersion('inne-wydanie-z-serwera');
    const { checkAppVersion } = await loadModule();

    await checkAppVersion();

    expect(reload).not.toHaveBeenCalled();
    expect(unregistered).toBe(0);
  });

  // Po starej blokadzie z poprzedniej doby wymiana musi być znowu możliwa.
  it('blokada wygasa po czasie', async () => {
    localStorage.setItem(ATTEMPT_KEY, String(Date.now() - 24 * 3600 * 1000));
    serveVersion('inne-wydanie-z-serwera');
    const { checkAppVersion } = await loadModule();

    await checkAppVersion();

    expect(reload).toHaveBeenCalled();
  });

  it('pyta o wersję z pominięciem cache przeglądarki', async () => {
    serveVersion('inne-wydanie-z-serwera');
    const { checkAppVersion } = await loadModule();

    await checkAppVersion();

    const call = globalThis.fetch.mock.calls.find(([url]) => String(url).includes('version.json'));
    expect(call[1]).toMatchObject({ cache: 'no-store' });
  });
});
