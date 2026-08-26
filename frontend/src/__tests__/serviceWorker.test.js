/**
 * SERVICE WORKER
 *
 * Uruchamiamy wdrażany plik `public/firebase-messaging-sw.js` w podstawionym
 * środowisku workera i sprawdzamy niezmienniki, których naruszenie kończy się
 * awarią „apka nie wstaje, pomaga tylko czyszczenie danych strony”:
 *
 *  — do cache trafiają wyłącznie odpowiedzi 200,
 *  — nawigacja zawsze pyta sieć, zanim sięgnie po kopię,
 *  — aktywacja usuwa cache poprzednich wydań, ale nie cudze,
 *  — worker nigdy nie obsługuje żądania własnego skryptu.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const BUILD_ID = 'testbuild';
const ORIGIN = 'https://cyber-ponk.web.app';
const SHELL_CACHE = `cp-shell-${BUILD_ID}`;
const ASSET_CACHE = `cp-assets-${BUILD_ID}`;

/** Paczki wydania — podstawiamy je tak samo, jak robi to plugin w `vite.config.ts`. */
const RELEASE_ASSETS = ['/assets/index-abc123.js', '/assets/index-abc123.css', '/assets/AdminPage-def456.js'];

const SW_SOURCE = fs
  .readFileSync(path.resolve(import.meta.dirname, '../../public/firebase-messaging-sw.js'), 'utf8')
  .replaceAll('__CP_BUILD_ID__', BUILD_ID)
  .replace("'__CP_RELEASE_ASSETS__'", RELEASE_ASSETS.map((p) => JSON.stringify(p)).join(', '));

/** Odpowiedź o kształcie, z którego korzysta worker — bez zależności od undici. */
function response({
  status = 200,
  body = '',
  type = 'basic',
  redirected = false,
  contentType = 'application/javascript',
} = {}) {
  return {
    status,
    type,
    redirected,
    body,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    clone: () => response({ status, body, type, redirected, contentType }),
    text: () => Promise.resolve(body),
  };
}

const htmlResponse = (body) => response({ body, contentType: 'text/html; charset=utf-8' });

/** Serwer oddający dokument pod `/index.html`, a kod pod pozostałymi adresami. */
function serveRelease() {
  fetchMock.mockImplementation((url) => Promise.resolve(
    url === '/index.html' ? htmlResponse('<!doctype html>') : response({ body: 'kod' }),
  ));
}

function createCacheStorage() {
  const store = new Map();
  const keyOf = (request) => (typeof request === 'string'
    ? new URL(request, `${ORIGIN}/`).toString()
    : request.url);

  const open = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name);
    return {
      match: (request) => Promise.resolve(entries.get(keyOf(request))),
      put: (request, value) => {
        entries.set(keyOf(request), value);
        return Promise.resolve();
      },
    };
  };

  return {
    store,
    names: () => [...store.keys()],
    entries: (name) => [...(store.get(name)?.keys() ?? [])],
    seed: (name, url, value) => { open(name); store.get(name).set(keyOf(url), value); },
    open: (name) => Promise.resolve(open(name)),
    keys: () => Promise.resolve([...store.keys()]),
    delete: (name) => Promise.resolve(store.delete(name)),
    match: (request, options) => {
      const names = options?.cacheName ? [options.cacheName] : [...store.keys()];
      for (const name of names) {
        const hit = store.get(name)?.get(keyOf(request));
        if (hit) return Promise.resolve(hit);
      }
      return Promise.resolve(undefined);
    },
  };
}

let sw;
let caches;
let fetchMock;

/** Ładuje workera z podstawionym `self`, `caches` i `fetch`. */
function loadWorker() {
  const handlers = new Map();
  caches = createCacheStorage();
  fetchMock = vi.fn();

  const self = {
    location: { origin: ORIGIN },
    registration: { unregister: vi.fn().mockResolvedValue(true), showNotification: vi.fn() },
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    addEventListener: (type, handler) => handlers.set(type, handler),
  };

  // `importScripts` nie istnieje poza workerem — worker musi to znieść i dalej
  // obsługiwać cache, więc brak SDK jest tu celowy.
  new Function('self', 'caches', 'fetch', 'clients', 'importScripts', 'console', 'Response', SW_SOURCE)(
    self,
    caches,
    (...args) => fetchMock(...args),
    { matchAll: vi.fn(), openWindow: vi.fn() },
    undefined,
    { warn: vi.fn(), error: vi.fn() },
    globalThis.Response ?? class { constructor(body, init) { Object.assign(this, init, { body }); } },
  );

  return {
    self,
    /** Odpala handler i zwraca to, czym worker odpowiedział na żądanie. */
    request: (url, init = {}) => {
      const event = {
        request: { url: new URL(url, `${ORIGIN}/`).toString(), method: 'GET', mode: 'no-cors', ...init },
        respondWith: vi.fn(),
        waitUntil: vi.fn(),
      };
      handlers.get('fetch')(event);
      return event;
    },
    lifecycle: (type, data) => {
      const event = { waitUntil: vi.fn((p) => p), data };
      handlers.get(type)(event);
      return event.waitUntil.mock.calls[0]?.[0];
    },
  };
}

beforeEach(() => {
  sw = loadWorker();
});

describe('instalacja', () => {
  it('zapisuje powłokę i komplet paczek wydania', async () => {
    serveRelease();

    await sw.lifecycle('install');

    // Straż startu należy do powłoki, nie do paczek — `handleStatic` szuka jej
    // właśnie w tym cache i tylko tam ją znajdzie offline.
    expect(caches.entries(SHELL_CACHE).sort()).toEqual([
      `${ORIGIN}/boot-guard.js`,
      `${ORIGIN}/index.html`,
    ]);
    // Cała lista, nie tylko to, co wymienia `index.html`: inaczej offline
    // pierwsze wejście w osobno doładowywaną zakładkę kończy się błędem.
    expect(caches.entries(ASSET_CACHE).sort()).toEqual(
      RELEASE_ASSETS.map((p) => `${ORIGIN}${p}`).sort(),
    );
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  // Cache HTTP przeglądarki potrafi trzymać zapisaną odpowiedź 404 pod adresem
  // z hashem treści. Sięgnięcie po niego przeniosłoby ten błąd do cache workera
  // i utrwaliło awarię na całe wydanie. `reload` dodatkowo nadpisuje zatruty wpis.
  it('pobiera pliki z pominięciem cache przeglądarki', async () => {
    serveRelease();

    await sw.lifecycle('install');

    expect(fetchMock).toHaveBeenCalled();
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toMatchObject({ cache: 'reload' });
    }
  });

  // Zerwana instalacja zostawiłaby użytkownika bez workera na stałe.
  it('nie wywraca się, gdy sieć zawiedzie w trakcie', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(sw.lifecycle('install')).resolves.not.toThrow();
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  it('nie zapisuje powłoki, gdy serwer odpowie błędem', async () => {
    fetchMock.mockResolvedValue(response({ status: 404, body: 'Not Found' }));

    await sw.lifecycle('install');

    expect(caches.entries(SHELL_CACHE)).toEqual([]);
  });
});

describe('aktywacja', () => {
  it('usuwa cache poprzednich wydań, zostawia bieżące i cudze', async () => {
    caches.seed('cp-shell-staryhash', '/index.html', response());
    caches.seed('cp-assets-staryhash', '/assets/old.js', response());
    caches.seed(SHELL_CACHE, '/index.html', response());
    caches.seed('inna-apka-na-tym-origin', '/x', response());

    await sw.lifecycle('activate');

    expect(caches.names()).toEqual([SHELL_CACHE, 'inna-apka-na-tym-origin']);
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });
});

describe('paczki z /assets/', () => {
  // To jest ten błąd, który psuł apkę na stałe: zapisana odpowiedź 404 pod
  // adresem z hashem treści nigdy sama nie wygasa.
  it('NIE zapisuje odpowiedzi błędnej', async () => {
    fetchMock.mockResolvedValue(response({ status: 404, body: 'Not Found' }));

    const event = sw.request('/assets/index-abc123.js');
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.status).toBe(404);
    expect(caches.entries(ASSET_CACHE)).toEqual([]);
  });

  it('zapisuje poprawną odpowiedź', async () => {
    fetchMock.mockResolvedValue(response({ body: 'kod' }));

    const event = sw.request('/assets/index-abc123.js');
    await event.respondWith.mock.calls[0][0];

    expect(caches.entries(ASSET_CACHE)).toEqual([`${ORIGIN}/assets/index-abc123.js`]);
    // Pominięcie cache HTTP to jedyny sposób ominięcia zapisanego wcześniej 404.
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'reload' });
  });

  it('podaje kopię z cache bez pytania sieci', async () => {
    caches.seed(ASSET_CACHE, '/assets/index-abc123.js', response({ body: 'z cache' }));

    const event = sw.request('/assets/index-abc123.js');
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.body).toBe('z cache');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Zapisana kopia ratuje apkę nawet wtedy, gdy hosting zgubi plik po wdrożeniu.
  it('kopia z cache działa, gdy serwer zwraca 404', async () => {
    caches.seed(ASSET_CACHE, '/assets/index-abc123.js', response({ body: 'z cache' }));
    fetchMock.mockResolvedValue(response({ status: 404 }));

    const event = sw.request('/assets/index-abc123.js');
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.body).toBe('z cache');
  });
});

describe('nawigacja', () => {
  it('pyta sieć i odświeża zapisaną powłokę', async () => {
    caches.seed(SHELL_CACHE, '/index.html', htmlResponse('stara powłoka'));
    fetchMock.mockResolvedValue(htmlResponse('nowa powłoka'));

    const event = sw.request('/attendance', { mode: 'navigate' });
    const result = await event.respondWith.mock.calls[0][0];

    expect(fetchMock).toHaveBeenCalledWith('/index.html', expect.objectContaining({ cache: 'reload' }));
    expect(result.body).toBe('nowa powłoka');
    expect((await caches.match('/index.html', { cacheName: SHELL_CACHE })).body).toBe('nowa powłoka');
  });

  // Bez tego jedna odpowiedź 404 albo strona logowania hotspotu zamiast
  // dokumentu pokazywałaby użytkownikowi biały ekran.
  it('gdy serwer odpowiada błędem, podaje sprawną kopię', async () => {
    caches.seed(SHELL_CACHE, '/index.html', response({ body: 'sprawna powłoka' }));
    fetchMock.mockResolvedValue(response({ status: 500, body: 'Server Error' }));

    const event = sw.request('/', { mode: 'navigate' });
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.body).toBe('sprawna powłoka');
  });

  it('gdy sieci nie ma, podaje kopię z cache', async () => {
    caches.seed(SHELL_CACHE, '/index.html', response({ body: 'sprawna powłoka' }));
    fetchMock.mockRejectedValue(new Error('offline'));

    const event = sw.request('/', { mode: 'navigate' });
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.body).toBe('sprawna powłoka');
  });

  it('bez kopii i bez sieci pokazuje stronę offline, a nie pustkę', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const event = sw.request('/', { mode: 'navigate' });
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.status).toBe(503);
  });
});

describe('czego worker nie tyka', () => {
  // Przechwycenie własnego skryptu pozwoliłoby workerowi utrwalić swoją zepsutą
  // wersję i odciąć jedyną drogę wypuszczenia poprawki.
  it('własnego skryptu', () => {
    const event = sw.request('/firebase-messaging-sw.js');
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it('zasobów z obcych serwerów', () => {
    const event = sw.request('https://fonts.googleapis.com/css2?family=Bebas+Neue');
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it('żądań innych niż GET', () => {
    const event = sw.request('/assets/index-abc123.js', { method: 'POST' });
    expect(event.respondWith).not.toHaveBeenCalled();
  });
});

/**
 * Przekierowanie SPA oddaje `index.html` ze statusem 200 pod każdym brakującym
 * adresem poza `/assets/`. Sprawdzanie samego statusu tego nie łapie, a zapisanie
 * takiej odpowiedzi pod adresem skryptu czy ikony utrwala złą treść równie
 * skutecznie jak zapisane 404.
 */
describe('podmieniona treść z przekierowania SPA', () => {
  it('nie zapisuje dokumentu HTML pod adresem skryptu', async () => {
    fetchMock.mockResolvedValue(response({ body: '<!doctype html>', contentType: 'text/html' }));

    const event = sw.request('/boot-guard.js');
    await event.respondWith.mock.calls[0][0];

    expect(caches.entries(SHELL_CACHE)).toEqual([]);
  });

  it('nie zapisuje dokumentu HTML pod adresem paczki', async () => {
    fetchMock.mockResolvedValue(response({ body: '<!doctype html>', contentType: 'text/html' }));

    const event = sw.request('/assets/index-abc123.js');
    await event.respondWith.mock.calls[0][0];

    expect(caches.entries(ASSET_CACHE)).toEqual([]);
  });

  it('nie zapisuje powłoki, gdy zamiast dokumentu przyjdzie coś innego', async () => {
    fetchMock.mockResolvedValue(response({ body: 'to nie dokument', contentType: 'text/plain' }));
    caches.seed(SHELL_CACHE, '/index.html', response({ body: 'sprawna powłoka', contentType: 'text/html' }));

    const event = sw.request('/', { mode: 'navigate' });
    const result = await event.respondWith.mock.calls[0][0];

    expect(result.body).toBe('sprawna powłoka');
  });
});
