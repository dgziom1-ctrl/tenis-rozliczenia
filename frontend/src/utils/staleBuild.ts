/**
 * Samonaprawa po wdrożeniu nowej wersji.
 *
 * Każdy build Vite nadaje plikom nowe nazwy z hashem, a Firebase Hosting trzyma
 * tylko pliki bieżącego wydania. Jeśli przeglądarka poda ze swojego cache stary
 * `index.html`, wskazuje on paczki, których już nie ma — aplikacja wywala się
 * przy starcie albo przy pierwszym przejściu na leniwie ładowaną zakładkę.
 *
 * Nagłówki w `firebase.json` mają nie dopuścić do zestarzenia się dokumentu, ale
 * cache bywa też po drodze (proxy, PWA, telefon w tunelu). Ten moduł jest siatką
 * bezpieczeństwa: rozpoznaje taką awarię i przeładowuje stronę zamiast pokazać
 * użytkownikowi ekran błędu, po którym pomaga tylko czyszczenie danych.
 */

/** Ostatnia próba ratunku — chroni przed pętlą przeładowań, gdy błąd jest inny. */
const ATTEMPT_KEY = 'stale-build-reload-at';

/** Krócej niż tyle od poprzedniej próby uznajemy, że przeładowanie nie pomogło. */
const RETRY_COOLDOWN_MS = 30_000;

/**
 * Komunikaty, którymi przeglądarki sygnalizują brak pliku z paczką. Różnią się
 * między silnikami, a przy przekierowaniu na `index.html` potrafi dojść jeszcze
 * błąd składni — do skryptu trafia wtedy HTML zaczynający się od `<`.
 */
const STALE_BUILD_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'expected a javascript module script',
  'chunkloaderror',
  'loading chunk',
  'loading css chunk',
  "unexpected token '<'",
];

function messageOf(reason: unknown): string {
  if (typeof reason === 'string') return reason;
  if (reason instanceof Error) return `${reason.name} ${reason.message}`;
  return '';
}

/** Czy błąd wygląda na brak pliku z nieaktualnego wydania, a nie zwykły bug. */
export function isStaleBuildError(reason: unknown): boolean {
  const message = messageOf(reason).toLowerCase();
  return message.length > 0 && STALE_BUILD_PATTERNS.some(pattern => message.includes(pattern));
}

function readLastAttempt(): number {
  try {
    return Number(sessionStorage.getItem(ATTEMPT_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Czy warto jeszcze próbować przeładowania.
 *
 * Gdy świeży start znowu kończy się tym samym błędem, przeładowanie niczego nie
 * naprawi — lepiej pokazać ekran błędu niż zapętlić przeglądarkę.
 */
export function canRecoverFromStaleBuild(): boolean {
  return Date.now() - readLastAttempt() > RETRY_COOLDOWN_MS;
}

/**
 * Czyści cache i ładuje stronę od nowa. Zwraca `false`, gdy próbowaliśmy już
 * przed chwilą — wtedy woła o pomoc ekran błędu.
 */
export function recoverFromStaleBuild(): boolean {
  if (!canRecoverFromStaleBuild()) return false;

  try {
    sessionStorage.setItem(ATTEMPT_KEY, String(Date.now()));
  } catch { /* tryb prywatny — brak zapisu tylko odbiera ochronę przed pętlą */ }

  const reload = () => window.location.reload();

  // Cache Storage nie jest dziś przez apkę używany, ale mógł zostać po starszej
  // wersji Service Workera i przeżyć zwykłe przeładowanie.
  if (typeof caches === 'undefined') {
    reload();
    return true;
  }
  caches.keys()
    .then(keys => Promise.all(keys.map(key => caches.delete(key))))
    .catch(() => { /* i tak przeładowujemy */ })
    .finally(reload);
  return true;
}

/**
 * Czy nie udało się wczytać pliku wchodzącego w skład tego wydania.
 *
 * Tylko własne zasoby — nieosiągalny font z Google czy inny skrypt z zewnątrz
 * nie znaczy, że build jest nieaktualny, a przeładowywanie strony za każdym
 * razem, gdy sieć kaprysi, byłoby gorsze od samego problemu.
 */
function isOwnResourceFailure(target: EventTarget | null): boolean {
  const url = target instanceof HTMLScriptElement ? target.src
    : (target instanceof HTMLLinkElement && target.rel === 'stylesheet') ? target.href
      : null;
  if (!url) return false;

  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Podpina globalną obsługę błędów ładowania paczek.
 *
 * Łapie też awarie sprzed montażu Reacta — bez tego nieudany skrypt wejściowy
 * zostawia całkiem pustą stronę, na której nie ma nawet czego kliknąć.
 */
export function installStaleBuildRecovery(): void {
  window.addEventListener('unhandledrejection', event => {
    if (isStaleBuildError(event.reason)) recoverFromStaleBuild();
  });

  window.addEventListener('error', event => {
    if (isOwnResourceFailure(event.target) || isStaleBuildError(event.error ?? event.message)) {
      recoverFromStaleBuild();
    }
  }, true);
}
