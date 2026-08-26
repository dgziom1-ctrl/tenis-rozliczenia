/**
 * STRAŻ STARTU — samonaprawa aplikacji bez czyszczenia danych przeglądarki.
 *
 * Dlaczego to nie jest część bundla:
 * paczki aplikacji mają w nazwie hash i leżą pod `/assets/`. Jeśli któraś z nich
 * jest nieosiągalna albo przeglądarka trzyma w cache jej błędną odpowiedź, kod
 * aplikacji nigdy się nie wykona — więc żaden ratunek zapisany w bundlu nie ma
 * jak wystartować. Ten plik ma stały adres (bez hasha, więc nie znika po
 * wdrożeniu) i jest serwowany z `no-cache`, czyli przeglądarka musi go za każdym
 * razem potwierdzić na serwerze — nie da się go podać ze starego cache.
 *
 * Dlaczego to nie jest skrypt inline:
 * CSP w `firebase.json` nie zawiera `'unsafe-inline'` w `script-src`, więc
 * przeglądarka zablokowałaby kod wpisany wprost w `index.html`.
 *
 * Co robi: pilnuje, żeby aplikacja faktycznie wstała. Jeśli nie wstanie,
 * przechodzi kolejne szczeble naprawy — od odświeżenia zasobów, przez usunięcie
 * Service Workera i cache, aż po pełne wyczyszczenie magazynów. Ostatni szczebel
 * to widoczny ekran ratunkowy, żeby użytkownik nigdy nie został z białą stroną.
 */
(function () {
  'use strict';

  /** Licznik prób naprawy. W `localStorage`, bo `sessionStorage` ginie przy każdym starcie PWA. */
  var LEDGER_KEY = 'cp-boot-recovery';

  /** Ile czekamy na zamontowanie Reacta, zanim uznamy start za nieudany. */
  var BOOT_DEADLINE_MS = 15000;

  /**
   * Po tym czasie spokoju zapominamy stare próby — kolejna awaria zaczyna od zera.
   *
   * Licznika NIE zerujemy po udanym starcie i to jest celowe. Awaria potrafi
   * wyjść dopiero przy wejściu w zakładkę doładowywaną osobno, już po tym, jak
   * apka normalnie wstała. Gdyby udany start czyścił licznik, każde takie wejście
   * zaczynałoby drabinkę od pierwszego szczebla i przeglądarka przeładowywałaby
   * stronę bez końca, nigdy nie sięgając po skuteczniejsze kroki.
   */
  var LEDGER_TTL_MS = 10 * 60 * 1000;

  /** Powyżej tego szczebla nie ma czego już czyścić — pokazujemy ekran ratunkowy. */
  var MAX_STAGE = 3;

  /** Parametr wymuszający świeży dokument, gdyby po drodze stał cache proxy. */
  var BUST_PARAM = '__cpr';

  /** Bazy IndexedDB tworzone przez SDK Firebase — `databases()` nie istnieje w starszym Safari. */
  var KNOWN_DATABASES = [
    'firebase-installations-database',
    'firebase-messaging-database',
    'firebase-heartbeat-database',
    'firebaseLocalStorageDb'
  ];

  /**
   * Komunikaty, którymi silniki sygnalizują brak paczki. Przy przekierowaniu na
   * `index.html` dochodzi jeszcze błąd składni — do skryptu trafia wtedy HTML.
   */
  var STALE_PATTERNS = [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'expected a javascript module script',
    'chunkloaderror',
    'loading chunk',
    'loading css chunk',
    "unexpected token '<'",
    // Tak samą sytuację nazywa Firefox.
    "expected expression, got '<'"
  ];

  var booted = false;
  var healing = false;
  var deadlineTimer = null;

  function noop() {}

  // ── Licznik prób ───────────────────────────────────────────────────────────

  function readLedger() {
    try {
      var raw = localStorage.getItem(LEDGER_KEY);
      if (!raw) return 0;
      var parsed = JSON.parse(raw);
      var stage = typeof parsed.stage === 'number' ? parsed.stage : 0;
      var at = typeof parsed.at === 'number' ? parsed.at : 0;
      // Dawna awaria nie może blokować ratunku przy nowej.
      return Date.now() - at > LEDGER_TTL_MS ? 0 : stage;
    } catch {
      return 0;
    }
  }

  function writeLedger(stage) {
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify({ stage: stage, at: Date.now() }));
    } catch {
      /* tryb prywatny — tracimy tylko ochronę przed pętlą */
    }
  }

  function clearLedger() {
    try {
      localStorage.removeItem(LEDGER_KEY);
    } catch {
      /* nic nie szkodzi */
    }
  }

  // ── Narzędzia czyszczące ───────────────────────────────────────────────────

  /** Obietnica, która nigdy nie wisi dłużej niż `ms` — naprawa nie może się zaciąć. */
  function withTimeout(promise, ms) {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      setTimeout(finish, ms);
      try {
        promise.then(finish, finish);
      } catch {
        finish();
      }
    });
  }

  function isSameOrigin(url) {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return false;
    }
  }

  /** Adresy wszystkich plików tego wydania, które są wpisane w dokument. */
  function ownResourceUrls() {
    var urls = [location.href];
    var nodes = document.querySelectorAll('script[src], link[href]');
    for (var i = 0; i < nodes.length; i++) {
      var url = nodes[i].src || nodes[i].href;
      if (url && isSameOrigin(url) && urls.indexOf(url) === -1) urls.push(url);
    }
    return urls;
  }

  /**
   * Nadpisuje wpisy w cache HTTP świeżymi odpowiedziami z sieci.
   *
   * To sedno naprawy. Hosting nadaje nagłówek długiego cache także odpowiedziom
   * 404, więc jedno nieudane żądanie paczki potrafi zostać w cache na rok.
   * Zwykłe przeładowanie tego nie rusza, bo wpis jest wciąż „świeży”.
   * `cache: 'reload'` całkowicie pomija cache przy żądaniu i zapisuje w nim to,
   * co przyszło z sieci — dopiero to usuwa zatruty wpis.
   */
  function refetchFresh(failedUrl) {
    if (typeof fetch !== 'function') return Promise.resolve();

    var urls = ownResourceUrls();
    // Paczki doładowywanej osobno (zakładki) nie ma w dokumencie, więc bez tego
    // jej zatruty wpis w cache przeżyłby przeładowanie i awaria wróciłaby zaraz
    // po ponownym wejściu w tę samą zakładkę.
    if (failedUrl && isSameOrigin(failedUrl) && urls.indexOf(failedUrl) === -1) urls.push(failedUrl);

    var jobs = [];
    for (var i = 0; i < urls.length; i++) {
      try {
        jobs.push(fetch(urls[i], { cache: 'reload', credentials: 'same-origin' }).catch(noop));
      } catch {
        /* pojedynczy adres nie może przerwać naprawy */
      }
    }
    return withTimeout(Promise.all(jobs), 8000);
  }

  function purgeCacheStorage() {
    if (typeof caches === 'undefined') return Promise.resolve();
    return withTimeout(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      }),
      5000
    );
  }

  function unregisterWorkers() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return Promise.resolve();
    return withTimeout(
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
      }),
      5000
    );
  }

  function deleteDatabase(name) {
    return new Promise(function (resolve) {
      try {
        var request = indexedDB.deleteDatabase(name);
        request.onsuccess = resolve;
        request.onerror = resolve;
        // Inna karta trzyma otwarte połączenie — nie czekamy w nieskończoność.
        request.onblocked = resolve;
      } catch {
        resolve();
      }
    });
  }

  function wipeDatabases() {
    if (typeof indexedDB === 'undefined') return Promise.resolve();

    var names = KNOWN_DATABASES.slice();
    var discovery = typeof indexedDB.databases === 'function'
      ? indexedDB.databases().then(function (list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].name && names.indexOf(list[i].name) === -1) names.push(list[i].name);
        }
      }).catch(noop)
      : Promise.resolve();

    return withTimeout(discovery.then(function () { return Promise.all(names.map(deleteDatabase)); }), 5000);
  }

  /**
   * Czyści magazyny strony, ale zachowuje licznik prób.
   *
   * Licznik leży w `localStorage`, więc zwykłe `clear()` wymazywałoby go razem
   * z resztą. Drabinka wracałaby wtedy na pierwszy szczebel po każdym pełnym
   * czyszczeniu, nigdy nie dochodziła do ekranu ratunkowego i przeglądarka
   * przeładowywałaby pustą stronę bez końca.
   */
  function wipeWebStorage() {
    try {
      sessionStorage.clear();
    } catch {
      /* brak dostępu do magazynu */
    }
    try {
      var ledger = localStorage.getItem(LEDGER_KEY);
      localStorage.clear();
      if (ledger !== null) localStorage.setItem(LEDGER_KEY, ledger);
    } catch {
      /* brak dostępu do magazynu */
    }
  }

  // ── Przeładowanie ──────────────────────────────────────────────────────────

  function reloadFresh() {
    try {
      var url = new URL(location.href);
      url.searchParams.set(BUST_PARAM, String(Date.now()));
      location.replace(url.toString());
    } catch {
      location.reload();
    }
  }

  /**
   * Usuwa z adresu znacznik naprawy.
   *
   * Wołane przy starcie strażnika, a nie po udanym starcie aplikacji: router
   * czyta adres przy montowaniu, więc podmiana adresu za jego plecami zostawiłaby
   * go z parametrem, którego w pasku już nie ma.
   */
  function stripBustParam() {
    try {
      var url = new URL(location.href);
      if (!url.searchParams.has(BUST_PARAM)) return;
      url.searchParams.delete(BUST_PARAM);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    } catch {
      /* adres zostaje — nic się nie psuje */
    }
  }

  // ── Ekran ratunkowy ────────────────────────────────────────────────────────

  function styled(tag, styles, text) {
    var el = document.createElement(tag);
    for (var key in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, key)) el.style[key] = styles[key];
    }
    if (text) el.textContent = text;
    return el;
  }

  /**
   * Ostatnia linia obrony: widoczny ekran z jednym przyciskiem.
   *
   * Rysowany z gołego DOM, bez arkusza stylów i bez paczek aplikacji — musi
   * działać właśnie wtedy, gdy nic innego się nie wczytało.
   */
  function showRescueScreen(reason) {
    if (document.getElementById('cp-rescue')) return;

    var offline = navigator.onLine === false;

    var overlay = styled('div', {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', zIndex: '2147483647',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: '#08080c', overflowY: 'auto',
      font: '14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace', color: '#c8d3d8'
    });
    overlay.id = 'cp-rescue';

    var card = styled('div', {
      maxWidth: '420px', width: '100%', padding: '28px 24px', textAlign: 'center',
      background: '#0d0d12', border: '1px solid rgba(0,229,255,0.35)',
      boxShadow: '0 0 40px rgba(0,229,255,0.12)'
    });

    card.appendChild(styled('div', { fontSize: '2.4rem', marginBottom: '12px' }, offline ? '📡' : '🛠'));
    card.appendChild(styled('h1', {
      margin: '0 0 10px', fontSize: '1.1rem', letterSpacing: '0.14em',
      textTransform: 'uppercase', color: '#00d4ff', fontWeight: '700'
    }, offline ? 'Brak połączenia' : 'Naprawa aplikacji'));

    card.appendChild(styled('p', { margin: '0 0 20px', fontSize: '0.8rem', color: '#8b979c' },
      offline
        ? 'Cyber Ponk nie może się wczytać, bo urządzenie jest offline. Włącz internet i spróbuj ponownie.'
        : 'Cyber Ponk nie wystartował poprawnie. Kliknij poniżej — wyczyszczę zepsute dane i uruchomię apkę od nowa. Nie musisz nic robić w ustawieniach przeglądarki.'));

    var button = styled('button', {
      width: '100%', padding: '14px 18px', cursor: 'pointer',
      background: '#00d4ff', color: '#06060a', border: '0',
      font: '700 0.85rem/1 ui-monospace, SFMono-Regular, Menlo, monospace',
      letterSpacing: '0.12em', textTransform: 'uppercase'
    }, offline ? '↻ Spróbuj ponownie' : '⚡ Napraw i uruchom');

    button.addEventListener('click', function () {
      button.disabled = true;
      button.style.opacity = '0.6';
      if (offline) {
        // Bez sieci czyszczenie danych jest najgorszym możliwym ruchem: usunęłoby
        // zapisaną kopię offline, a przeładowanie nie miałoby jej skąd odtworzyć.
        // Użytkownik prosi o ponowną próbę, więc tylko przeładowujemy.
        button.textContent = 'ŁĄCZENIE...';
        reloadFresh();
        return;
      }
      button.textContent = 'CZYSZCZENIE...';
      hardReset();
    });
    card.appendChild(button);

    if (reason) {
      var details = document.createElement('details');
      details.style.marginTop = '18px';
      details.style.textAlign = 'left';
      details.appendChild(styled('summary', {
        cursor: 'pointer', fontSize: '0.7rem', color: '#5b6b70', letterSpacing: '0.08em'
      }, 'Szczegóły techniczne'));
      details.appendChild(styled('pre', {
        margin: '8px 0 0', fontSize: '0.65rem', color: '#5b6b70',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
      }, String(reason).slice(0, 400)));
      card.appendChild(details);
    }

    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
  }

  // ── Drabinka naprawy ───────────────────────────────────────────────────────

  /**
   * Owija krok czyszczenia tak, by nigdy nie odrzucił obietnicy.
   *
   * Bez tego wystarczy jeden nieudany krok (zablokowany magazyn w trybie
   * prywatnym, brak `caches` w starszej przeglądarce), żeby łańcuch przeskoczył
   * wszystkie kolejne — a to właśnie te dalsze kroki są najskuteczniejsze.
   */
  function settled(step) {
    return function () {
      try {
        return Promise.resolve(step()).catch(noop);
      } catch {
        return Promise.resolve();
      }
    };
  }

  /**
   * Kolejne szczeble naprawy. Każde nieudane uruchomienie sięga o jeden głębiej,
   * więc lekka awaria kosztuje jedno przeładowanie, a ciężka kończy się pełnym
   * czyszczeniem — ale nigdy pętlą przeładowań.
   *
   * Kroki niszczące (usunięcie workera, cache, magazynów) są zarezerwowane dla
   * sytuacji, w której aplikacja w ogóle nie wstała. Kiedy działa, a nie doszła
   * pojedyncza paczka, wolno nam najwyżej odświeżyć pliki i przeładować stronę.
   * Komunikat o nieudanym pobraniu paczki jest bowiem nie do odróżnienia od
   * zwykłego mignięcia sieci, a `navigator.onLine` w tunelu wciąż pokazuje
   * „online” — chwilowy brak zasięgu nie może kosztować użytkownika zapisanych
   * ustawień ani całej pamięci offline.
   */
  function heal(reason, failedUrl) {
    // Tylko jedna naprawa na jedno życie strony. `booted` nie blokuje niczego:
    // paczka zakładki potrafi nie doładować się długo po udanym starcie i wtedy
    // naprawa jest równie potrzebna.
    if (healing) return false;
    healing = true;

    if (deadlineTimer) clearTimeout(deadlineTimer);

    var offline = navigator.onLine === false;
    var deepestStage = booted ? 1 : MAX_STAGE;
    var stage = readLedger() + 1;

    if (offline || stage > deepestStage) {
      if (booted) {
        // Aplikacja jest na ekranie. Pełnoekranowy ekran ratunkowy zasłoniłby
        // sprawny interfejs z powodu jednej paczki, a licznika nie ruszamy, bo
        // żaden krok się nie wykonał. Błąd pokaże zgłaszający, u siebie.
        healing = false;
        return false;
      }
      // Offline też nie zużywa szczebla: przeładowanie i tak by nie pomogło,
      // a bez tego kilka uruchomień bez zasięgu zjadłoby całą drabinkę przed
      // pierwszą prawdziwą awarią.
      if (!offline) writeLedger(MAX_STAGE);
      showRescueScreen(reason);
      return true;
    }

    writeLedger(stage);

    // Adres podany wprost (nieudany `<script>`) albo wyłuskany z treści błędu —
    // przy imporcie dynamicznym nie ma elementu, z którego dałoby się go wziąć.
    var brokenUrl = failedUrl || urlFromMessage(reason);
    var steps = settled(function () { return refetchFresh(brokenUrl); })();
    if (stage >= 2) {
      steps = steps.then(settled(unregisterWorkers)).then(settled(purgeCacheStorage));
    }
    if (stage >= 3) {
      steps = steps.then(settled(wipeDatabases)).then(settled(wipeWebStorage));
    }
    steps.then(reloadFresh, reloadFresh);
    return true;
  }

  /**
   * Wszystko, co robi „wyczyść dane strony”, tylko jednym kliknięciem w apce.
   * Każdy krok osobno zabezpieczony, żeby przeładowanie doszło do skutku nawet
   * wtedy, gdy część magazynów jest niedostępna.
   */
  function hardReset() {
    clearLedger();
    settled(unregisterWorkers)()
      .then(settled(purgeCacheStorage))
      .then(settled(wipeDatabases))
      .then(settled(refetchFresh))
      .then(settled(wipeWebStorage))
      .then(reloadFresh, reloadFresh);
  }

  function matchesStalePattern(value) {
    var text = '';
    if (typeof value === 'string') text = value;
    else if (value && typeof value.message === 'string') text = value.name + ' ' + value.message;
    if (!text) return false;

    text = text.toLowerCase();
    for (var i = 0; i < STALE_PATTERNS.length; i++) {
      if (text.indexOf(STALE_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  /** Adres naszego własnego pliku, który się nie wczytał, albo `null`. */
  function ownResourceUrlOf(target) {
    if (!target || !target.tagName) return null;

    var tag = target.tagName.toLowerCase();
    var url = tag === 'script' ? target.src
      : (tag === 'link' && target.rel === 'stylesheet') ? target.href
        : null;
    return url && isSameOrigin(url) ? url : null;
  }

  /**
   * Wyłuskuje adres pliku z treści błędu.
   *
   * Silniki wpisują go w komunikat („Failed to fetch dynamically imported
   * module: https://…/assets/AdminPage-x.js”), a tylko stamtąd da się dowiedzieć,
   * której paczki dotyczy awaria — element `<script>` dla importu dynamicznego
   * nie istnieje.
   */
  function urlFromMessage(value) {
    var text = typeof value === 'string' ? value : (value && value.message) || '';
    var match = String(text).match(/https?:\/\/[^\s"')]+/);
    return match ? match[0] : null;
  }

  // ── Podłączenie ────────────────────────────────────────────────────────────

  function armDeadline() {
    deadlineTimer = setTimeout(function () {
      if (booted) return;
      // Karta w tle ma wstrzymywane timery — to nie znaczy, że start się nie udał.
      if (document.hidden) {
        armDeadline();
        return;
      }
      heal('Aplikacja nie wystartowała w ciągu ' + Math.round(BOOT_DEADLINE_MS / 1000) + ' s.');
    }, BOOT_DEADLINE_MS);
  }

  window.addEventListener('error', function (event) {
    var resourceUrl = ownResourceUrlOf(event.target);
    var problem = event.error || event.message;
    if (resourceUrl || matchesStalePattern(problem)) {
      heal(problem || 'Nie udało się wczytać pliku aplikacji.', resourceUrl);
    }
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    if (matchesStalePattern(event.reason)) heal(event.reason);
  });

  /**
   * Umowa z aplikacją. `ready()` woła `main.tsx` po pierwszym renderze; reszta
   * pozwala kodowi aplikacji korzystać z tej samej drabinki, zamiast trzymać
   * drugą, rozjeżdżającą się implementację.
   */
  window.__cpBoot = {
    ready: function () {
      if (booted) return;
      booted = true;
      if (deadlineTimer) clearTimeout(deadlineTimer);
    },
    heal: heal,
    hardReset: hardReset,
    rescue: showRescueScreen,
    isStaleBuildError: matchesStalePattern,
    stage: readLedger
  };

  stripBustParam();
  armDeadline();

  // Ślad w konsoli zostaje jako trop przy diagnozie na cudzym telefonie.
  var previousStage = readLedger();
  if (previousStage > 0) {
    console.warn('[boot-guard] Poprzedni start wymagał naprawy (szczebel ' + previousStage + ').');
  }
}());
