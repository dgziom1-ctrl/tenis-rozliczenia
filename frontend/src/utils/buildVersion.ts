/**
 * Ostatnia gwarancja, że urządzenie nie zostanie na starym wydaniu.
 *
 * Service Worker potrafi podać komplet plików poprzedniej wersji: powłokę i jej
 * paczki, spójne między sobą i dostępne offline. Dopóki nie zauważy własnej
 * aktualizacji, telefon uruchamia stare wydanie przy każdym otwarciu — nawet po
 * wdrożeniu poprawki, i nawet po zamknięciu aplikacji. Dokładnie to się zdarzyło:
 * na urządzeniu została zepsuta wersja, a jedynym wyjściem było wyczyszczenie
 * danych przeglądarki.
 *
 * Ten moduł nie polega na workerze. Porównuje wydanie, na którym akurat działa
 * aplikacja, z tym wystawionym przez serwer w `version.json` (worker celowo tego
 * adresu nie obsługuje). Gdy się różnią, usuwa workera z jego cache i ładuje
 * stronę od nowa — czyli robi to, co dotąd trzeba było robić ręcznie
 * w ustawieniach przeglądarki.
 */

/** Podstawiane przy budowaniu (`define` w `vite.config.ts`). */
declare const __CP_APP_BUILD__: string;

/** Wydanie, na którym działa ten kod. Eksportowane, bo testy muszą je znać. */
export const APP_BUILD = typeof __CP_APP_BUILD__ === 'string' ? __CP_APP_BUILD__ : 'dev';

const VERSION_URL = '/version.json';

/** Znacznik ostatniej wymuszonej aktualizacji — chroni przed pętlą przeładowań. */
const ATTEMPT_KEY = 'cp-forced-update-at';

/**
 * Krócej niż tyle od poprzedniej próby uznajemy, że wymiana wydania nie pomogła.
 * Bez tego rozjazd, którego nie da się naprawić (np. serwer wystawia inny
 * identyfikator, niż faktycznie serwuje), przeładowywałby stronę bez końca.
 */
const RETRY_COOLDOWN_MS = 10 * 60 * 1000;

/** Ile najdłużej czekamy na odpowiedź — sprawdzenie wersji nie może niczego blokować. */
const FETCH_TIMEOUT_MS = 8000;

/** Jak często pytamy o wersję przy dłuższej pracy z aplikacją. */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Minimalny odstęp między sprawdzeniami, niezależnie od tego, co je wywołało. */
const CHECK_THROTTLE_MS = 60 * 1000;

let lastCheck = 0;
let updating = false;

function recentlyForcedUpdate(): boolean {
  try {
    const at = Number(localStorage.getItem(ATTEMPT_KEY)) || 0;
    return Date.now() - at < RETRY_COOLDOWN_MS;
  } catch {
    // Bez magazynu tracimy ochronę przed pętlą, więc lepiej nie ryzykować.
    return true;
  }
}

function markForcedUpdate(): void {
  try {
    localStorage.setItem(ATTEMPT_KEY, String(Date.now()));
  } catch {
    /* tryb prywatny — i tak spróbujemy raz */
  }
}

/** Wydanie wystawione przez serwer albo `null`, gdy nie da się go ustalić. */
async function fetchServerBuild(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(VERSION_URL, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    const buildId = (payload as { buildId?: unknown } | null)?.buildId;
    return typeof buildId === 'string' && buildId.length > 0 ? buildId : null;
  } catch {
    // Brak sieci albo uszkodzona odpowiedź — nie mamy podstaw do działania.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Usuwa Service Workera i jego cache, potem ładuje stronę od nowa.
 *
 * Wyrejestrowanie jest tu istotne: dopóki worker żyje, może dalej podawać
 * poprzednie wydanie. Danych użytkownika nie tykamy — to wymiana wersji,
 * a nie czyszczenie aplikacji.
 */
async function replaceRelease(): Promise<void> {
  markForcedUpdate();

  try {
    if (navigator.serviceWorker?.getRegistrations) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
  } catch { /* i tak przeładowujemy */ }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch { /* i tak przeładowujemy */ }

  try {
    // Świeży dokument z pominięciem cache HTTP — bez tego przeglądarka mogłaby
    // podać ten sam stary `index.html`, od którego się zaczęło.
    await fetch(window.location.href, { cache: 'reload', credentials: 'same-origin' });
  } catch { /* i tak przeładowujemy */ }

  window.location.reload();
}

/**
 * Jednorazowe sprawdzenie wersji. Gdy serwer wystawia inne wydanie, niż to,
 * na którym działa kod, wymienia je.
 *
 * Bez zaglądania do zmiennych środowiskowych — dzięki temu zachowanie
 * produkcyjne da się przetestować wprost, a wyłączanie na czas rozwoju jest
 * sprawą `watchAppVersion`.
 */
export async function checkAppVersion(): Promise<void> {
  if (updating) return;
  if (Date.now() - lastCheck < CHECK_THROTTLE_MS) return;
  lastCheck = Date.now();

  const serverBuild = await fetchServerBuild();
  if (serverBuild === null || serverBuild === APP_BUILD) return;

  // Serwer ma inne wydanie niż my — czyli działamy na starym.
  if (recentlyForcedUpdate()) {
    console.warn(`[wersja] Serwer ma ${serverBuild}, aplikacja ${APP_BUILD} — wymiana już była, nie ponawiam.`);
    return;
  }

  updating = true;
  console.warn(`[wersja] Aplikacja działa na starym wydaniu (${APP_BUILD} vs ${serverBuild}) — wymieniam.`);
  await replaceRelease();
}

/**
 * Podpina sprawdzanie wersji: przy starcie, przy powrocie do aplikacji i co
 * pół godziny przy dłuższej pracy.
 */
export function watchAppVersion(): void {
  // Na serwerze deweloperskim wydania nie ma, a przeładowywanie strony
  // przeszkadzałoby w pracy.
  if (import.meta.env.DEV) return;

  const check = () => { void checkAppVersion(); };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('online', check);
  window.setInterval(check, CHECK_INTERVAL_MS);

  // Przy starcie z opóźnieniem: pierwsze sekundy należą do renderowania
  // i pobrania danych, a nie do sprawdzania wersji.
  window.setTimeout(check, 4000);
}
