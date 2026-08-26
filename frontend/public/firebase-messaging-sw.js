/**
 * Jedyny Service Worker aplikacji: cache powłoki + powiadomienia push.
 *
 * Dlaczego jeden plik, a nie dwa: pod danym zasięgiem („/”) może rządzić tylko
 * jeden worker. Dwie osobne rejestracje wypierałyby się nawzajem i ta zwycięska
 * kasowałaby obsługę drugiej — apka gubiłaby raz cache, raz powiadomienia.
 *
 * Zasady, których nie wolno tu naruszyć — każda z nich zamyka jedną drogę do
 * awarii „apka nie wstaje, pomaga tylko czyszczenie danych”:
 *
 *  1. Do cache trafiają WYŁĄCZNIE odpowiedzi 200. Zapisany raz błąd (404 po
 *     wdrożeniu, strona logowania hotelowego Wi-Fi) zostawałby na stałe.
 *  2. Nawigacje idą najpierw do sieci. Świeży `index.html` zawsze wygrywa,
 *     więc apka nie potrafi „zamarznąć” na starym wydaniu.
 *  3. Każde żądanie do sieci ma limit czasu. Bez tego wiszące połączenie
 *     w słabym zasięgu blokuje start, mimo że w cache leży sprawna kopia.
 *  4. Nazwy cache zawierają identyfikator builda, a `activate` usuwa wszystkie
 *     pozostałe. Powłoka i paczki nigdy nie mieszają się między wydaniami.
 *  5. Worker nigdy nie obsługuje żądania własnego skryptu. Inaczej mógłby
 *     utrwalić własną zepsutą wersję i odciąć jedyną drogę aktualizacji.
 */

/** Podmieniane przy budowaniu (patrz `vite.config.ts`) — nowe wydanie = nowy cache. */
const BUILD_ID = '__CP_BUILD_ID__';

const SHELL_CACHE = `cp-shell-${BUILD_ID}`;
const ASSET_CACHE = `cp-assets-${BUILD_ID}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE];

/** Stały klucz powłoki — każda trasa SPA dostaje ten sam dokument. */
const SHELL_KEY = '/index.html';

/**
 * Straż startu. Trzymana w cache powłoki, nie paczek — ma stały adres bez hasha
 * i `handleStatic` szuka jej właśnie tam.
 */
const BOOT_GUARD_KEY = '/boot-guard.js';

/**
 * Pełna lista paczek wydania, wstrzykiwana przy budowaniu (patrz `vite.config.ts`).
 *
 * Wyciąganie jej z `index.html` nie wystarczało: dokument wymienia tylko paczki
 * potrzebne od razu, a zakładki doładowywane osobno zostawały poza cache. Offline
 * pierwsze wejście w taką zakładkę kończyło się błędem. W trybie deweloperskim
 * zostaje sam znacznik, więc go odfiltrowujemy.
 */
const RELEASE_ASSETS = ['__CP_RELEASE_ASSETS__'].filter((path) => path.startsWith('/'));

/** Ekran otwierany, gdy powiadomienie nie wskazuje własnego adresu. */
const DEFAULT_TARGET = '/?tab=dashboard';

/** Wolna sieć nie może blokować startu, gdy w cache leży sprawna kopia. */
const NAVIGATION_TIMEOUT_MS = 6000;
const ASSET_TIMEOUT_MS = 15000;

/**
 * Adresy, których worker nie tyka. Własny skrypt musi zawsze pochodzić z sieci,
 * żeby dało się wypuścić poprawkę do samego workera.
 */
const NEVER_INTERCEPT = ['/firebase-messaging-sw.js'];

function noop() {}

/**
 * Czy odpowiedź wolno zapisać w cache.
 *
 * Tylko 200 z naszego serwera. `redirected` odpada, bo odpowiedzi po
 * przekierowaniu nie da się później podać w odpowiedzi na nawigację.
 */
function isCacheable(response) {
  return Boolean(response) && response.status === 200 && response.type === 'basic' && !response.redirected;
}

function isHtml(response) {
  const type = (response.headers && response.headers.get('Content-Type')) || '';
  return type.toLowerCase().indexOf('text/html') !== -1;
}

/**
 * Czy treść odpowiedzi zgadza się z tym, o co pytaliśmy.
 *
 * Przekierowanie SPA oddaje `index.html` ze statusem 200 pod każdym brakującym
 * adresem poza `/assets/`. Zapisanie takiej odpowiedzi pod adresem skryptu,
 * manifestu czy ikony byłoby tym samym błędem co zapisanie 404: trwale złą
 * treścią pod adresem, który sam z siebie nigdy nie wygaśnie. Sprawdzenie samego
 * statusu tego nie łapie, bo status jest poprawny.
 */
function hasExpectedContent(response, path) {
  return path === SHELL_KEY ? isHtml(response) : !isHtml(response);
}

/** Zapis do cache nie może opóźniać odpowiedzi dla przeglądarki. */
function keepAlive(event, promise) {
  try {
    event.waitUntil(promise);
  } catch {
    // Zdarzenie zdążyło się zamknąć — zapis dokończy się sam, dopóki worker żyje.
  }
}

function fetchWithTimeout(input, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/** Prosta strona na wypadek pierwszego uruchomienia bez sieci. CSP nie pozwala na skrypt inline, więc sam link. */
function offlineShell() {
  return new Response(
    '<!doctype html><html lang="pl"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Cyber Ponk — offline</title></head>'
    + '<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;'
    + 'background:#08080c;color:#c8d3d8;font:14px/1.6 ui-monospace,Menlo,monospace;text-align:center">'
    + '<div style="padding:24px"><div style="font-size:2.4rem">📡</div>'
    + '<h1 style="font-size:1.1rem;letter-spacing:.14em;text-transform:uppercase;color:#00d4ff">Brak połączenia</h1>'
    + '<p style="color:#8b979c;font-size:.8rem">Cyber Ponk nie ma jeszcze zapisanej kopii offline.</p>'
    + '<a href="/" style="display:inline-block;margin-top:8px;padding:13px 20px;background:#00d4ff;color:#06060a;'
    + 'text-decoration:none;font-weight:700;letter-spacing:.12em;text-transform:uppercase">↻ Spróbuj ponownie</a>'
    + '</div></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

// ── Instalacja i aktywacja ───────────────────────────────────────────────────

/**
 * Pobiera pliki podanej listy prosto z sieci i zapisuje te, które przyszły całe.
 *
 * `cache: 'reload'` jest tu kluczowe: pomija cache HTTP przy czytaniu, a to
 * właśnie on potrafi trzymać zapisaną odpowiedź 404 pod adresem z hashem treści.
 * Bez tego instalacja przeniosłaby zatruty wpis do własnego cache i utrwaliła
 * awarię. W odróżnieniu od `no-store` zapisuje przy tym świeżą odpowiedź także
 * w cache przeglądarki, więc leczy zatruty wpis również dla kart bez workera.
 */
async function warmCache(cache, paths) {
  await Promise.all(paths.map(async (path) => {
    try {
      const response = await fetchWithTimeout(
        path,
        { cache: 'reload', credentials: 'same-origin' },
        ASSET_TIMEOUT_MS,
      );
      if (isCacheable(response) && hasExpectedContent(response, path)) await cache.put(path, response);
    } catch {
      /* pojedynczy plik nie może wywrócić instalacji */
    }
  }));
}

/**
 * Zapisuje komplet plików wydania.
 *
 * Robimy to na etapie instalacji, bo wtedy sieć na pewno działa (przeglądarka
 * właśnie ściągnęła ten plik). Dzięki temu `activate` może bez ryzyka usunąć
 * cache poprzedniego wydania — nowe ma już wszystko, czego potrzebuje, także
 * paczki zakładek, w które użytkownik jeszcze nie wchodził.
 */
async function precacheShell() {
  const shellCache = await caches.open(SHELL_CACHE);
  await warmCache(shellCache, [SHELL_KEY, BOOT_GUARD_KEY]);

  const assetCache = await caches.open(ASSET_CACHE);
  await warmCache(assetCache, RELEASE_ASSETS);
}

self.addEventListener('install', (event) => {
  // Nieudane pobranie zapasu nie może zablokować instalacji — bez cache apka
  // wciąż działa online, a z zerwaną instalacją nie działałaby wcale.
  event.waitUntil(precacheShell().catch(noop).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('cp-') && !CURRENT_CACHES.includes(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// ── Obsługa żądań ────────────────────────────────────────────────────────────

/** Rozstrzyga się wartością `null` po zadanym czasie — do wyścigu z siecią. */
function timeoutAfter(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

/** Świeży dokument z sieci albo `null`, gdy sieć zawiodła lub oddała nie to, co trzeba. */
async function fetchFreshShell(event, cache) {
  try {
    const response = await fetchWithTimeout(
      SHELL_KEY,
      { cache: 'reload', credentials: 'same-origin' },
      ASSET_TIMEOUT_MS,
    );
    // Zamiast dokumentu potrafi przyjść 404, 500 albo strona logowania hotspotu.
    if (!isCacheable(response) || !isHtml(response)) return null;

    keepAlive(event, cache.put(SHELL_KEY, response.clone()));
    return response;
  } catch {
    return null;
  }
}

/**
 * Nawigacja: najpierw sieć, cache tylko jako ratunek.
 *
 * Odwrotna kolejność (cache first) jest właśnie tym błędem, który zamraża PWA
 * na starym wydaniu i kończy się „wyczyść dane strony”.
 */
async function handleNavigation(event) {
  const cache = await caches.open(SHELL_CACHE);
  const fresh = fetchFreshShell(event, cache);
  const cached = await cache.match(SHELL_KEY);

  if (!cached) return (await fresh) ?? offlineShell();

  // Świeży dokument wygrywa, ale nie czekamy na niego bez końca. Limit wewnątrz
  // `fetchWithTimeout` liczy się tylko do nagłówków, a zerwane połączenie potrafi
  // przysłać nagłówki i zamilknąć — start wisiałby wtedy mimo sprawnej kopii.
  // Po tym czasie podajemy kopię, a świeża wersja dojdzie do cache w tle.
  const winner = await Promise.race([fresh, timeoutAfter(NAVIGATION_TIMEOUT_MS)]);
  return winner ?? cached;
}

/**
 * Paczki z `/assets/`: najpierw cache, bo nazwa zawiera hash treści.
 *
 * Kluczowe jest to, czego tu nie ma: nieudane pobranie nie zostaje zapisane.
 * Gdyby zostało, jedno 404 w trakcie wdrożenia psułoby apkę na stałe.
 */
async function handleAsset(event) {
  const request = event.request;
  const cache = await caches.open(ASSET_CACHE);

  // `ignoreVary`: pliki zapisujemy przy instalacji pod adresem (tekstem), a tutaj
  // szukamy po obiekcie żądania. Hosting wysyła `Vary: Accept-Encoding`, więc bez
  // tego drobna różnica nagłówków cicho unieważniłaby cały zapas.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  // `cache: 'reload'` pomija cache HTTP przy czytaniu i nadpisuje go świeżą
  // odpowiedzią. Sięgnięcie po niego mogłoby podać zapisane wcześniej 404 spod
  // tego samego adresu z hashem — wpis, którego przeładowanie nie omija.
  const response = await fetchWithTimeout(request, { cache: 'reload' }, ASSET_TIMEOUT_MS);
  if (isCacheable(response) && !isHtml(response)) {
    // Bez `waitUntil` przeglądarka dostaje odpowiedź dopiero po zapisaniu całego
    // pliku w cache, co przy paczce pół megabajta opóźnia pierwsze malowanie.
    keepAlive(event, cache.put(request, response.clone()));
  }
  return response;
}

/**
 * Reszta plików z naszego serwera (ikony, manifest, straż startu): z cache od
 * razu, a w tle świeża wersja na następny raz. Start nie czeka na sieć, a pliki
 * nie zostają w tyle na dłużej niż jedno uruchomienie.
 */
async function handleStatic(event) {
  const request = event.request;
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });

  const fromNetwork = fetchWithTimeout(request, {}, ASSET_TIMEOUT_MS).then((response) => {
    // Brakujący plik poza `/assets/` dostaje od przekierowania SPA `index.html`
    // ze statusem 200. Zapisanie go pod adresem ikony czy skryptu utrwaliłoby
    // złą treść dokładnie tak, jak zapisane 404.
    if (isCacheable(response) && !isHtml(response)) {
      keepAlive(event, cache.put(request, response.clone()));
    }
    return response;
  });

  if (cached) {
    keepAlive(event, fromNetwork.catch(noop));
    return cached;
  }
  return fromNetwork;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Obce serwery (fonty Google, SDK z gstatic) zostawiamy przeglądarce.
  if (url.origin !== self.location.origin) return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  if (NEVER_INTERCEPT.includes(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(handleAsset(event));
    return;
  }
  event.respondWith(handleStatic(event));
});

// ── Powiadomienia push ───────────────────────────────────────────────────────

/**
 * Zamienia `data.url` z powiadomienia na bezpieczny adres w obrębie tej apki.
 *
 * Adres bezwzględny (np. `https://obcy.example`) zignorowałby bazę i otworzył
 * cudzą stronę z naszego powiadomienia, więc wszystko spoza naszego origin
 * zastępujemy ekranem startowym.
 */
function resolveSameOriginUrl(rawUrl) {
  const fallback = new URL(DEFAULT_TARGET, self.location.origin).href;
  if (typeof rawUrl !== 'string' || rawUrl === '') return fallback;
  try {
    const url = new URL(rawUrl, self.location.origin);
    return url.origin === self.location.origin ? url.href : fallback;
  } catch {
    return fallback;
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = resolveSameOriginUrl(data.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // `includes` dopasowywało też adresy, w których nasz origin był tylko
        // fragmentem ścieżki obcej strony.
        if (client.url.startsWith(`${self.location.origin}/`) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});

/**
 * Push jest dopięty na końcu i w bloku `try`, bo zależy od SDK ładowanego
 * z gstatic. Awaria tego pobrania nie może przerwać instalacji workera —
 * bez cache powłoki apka przestałaby się otwierać offline, a to znacznie
 * gorsza usterka niż brak powiadomień.
 *
 * Wersja SDK trzymana zgodnie z `firebase` w frontend/package.json — rozjazd
 * major między stroną a workerem potrafi po cichu zepsuć odbiór powiadomień.
 */
try {
  importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey:            "PLACEHOLDER_API_KEY",
    authDomain:        "PLACEHOLDER_AUTH_DOMAIN",
    databaseURL:       "PLACEHOLDER_DATABASE_URL",
    projectId:         "PLACEHOLDER_PROJECT_ID",
    storageBucket:     "PLACEHOLDER_STORAGE_BUCKET",
    messagingSenderId: "PLACEHOLDER_MESSAGING_SENDER_ID",
    appId:             "PLACEHOLDER_APP_ID",
  });

  firebase.messaging().onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    const data = payload.data || {};
    self.registration.showNotification(title || 'Cyber-Ponk', {
      body,
      icon:     '/icon-192v2.png',
      badge:    '/icon-192v2.png',
      vibrate:  [100, 50, 100],
      // `url` na końcu: rozpakowanie `data` po nim nadpisywało wartość domyślną
      // pustym stringiem z payloadu.
      data:     { ...data, url: data.url || DEFAULT_TARGET },
      // Tag grupuje powiadomienia: dwa z tym samym tagiem zastępują się na ekranie.
      // Cloud Function nadaje go tak, żeby osobne zdarzenia miały osobne tagi
      // ('session-YYYY-MM-DD', 'streak-ImięGracza'). Wiadomość bez tagu i bez typu
      // trafia do wspólnego worka i nadpisze poprzednią taką samą.
      tag:      data.tag || data.type || 'default',
      renotify: true,
    });
  });
} catch (error) {
  console.warn('[sw] Push niedostępny, cache powłoki działa dalej:', error);
}
