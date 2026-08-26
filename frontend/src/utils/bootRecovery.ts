/**
 * Pomost do straży startu z `public/boot-guard.js`.
 *
 * Cała logika naprawy siedzi w tamtym pliku, bo tylko on jest dostępny wtedy,
 * gdy paczki aplikacji się nie wczytają. Tutaj są jedynie wywołania — celowo bez
 * własnej kopii wzorców błędów czy drabinki czyszczenia, żeby nie powstała druga,
 * rozjeżdżająca się z pierwszą implementacja tego samego.
 */

interface BootGuard {
  /** Aplikacja wstała — odwołaj czuwanie i wyczyść licznik prób. */
  ready: () => void;
  /** Wejdź o szczebel głębiej w naprawę. `false`, gdy start już się udał. */
  heal: (reason: unknown) => boolean;
  /** Pełne czyszczenie: worker, cache, magazyny — odpowiednik „wyczyść dane strony”. */
  hardReset: () => void;
  /** Pokaż ekran ratunkowy bez czekania na kolejne przeładowanie. */
  rescue: (reason?: unknown) => void;
  isStaleBuildError: (reason: unknown) => boolean;
  stage: () => number;
}

declare global {
  interface Window {
    __cpBoot?: BootGuard;
  }
}

function guard(): BootGuard | undefined {
  return typeof window === 'undefined' ? undefined : window.__cpBoot;
}

/** Czy błąd wygląda na brak pliku z nieaktualnego wydania, a nie zwykły bug. */
export function isStaleBuildError(reason: unknown): boolean {
  return guard()?.isStaleBuildError(reason) ?? false;
}

/**
 * Zgłasza, że aplikacja faktycznie się wyrenderowała.
 *
 * Bez tego straż startu po kilkunastu sekundach uzna start za nieudany
 * i przeładuje stronę.
 */
export function signalAppReady(): void {
  guard()?.ready();
}

/**
 * Uruchamia naprawę. Zwraca `false`, gdy nie ma czego naprawiać albo strażnika
 * nie ma pod ręką — wtedy o pomoc woła ekran błędu.
 */
export function recoverFromStaleBuild(reason: unknown): boolean {
  return guard()?.heal(reason) ?? false;
}

/** Naprawa na żądanie użytkownika, np. z przycisku na ekranie błędu. */
export function hardResetApp(): void {
  const bootGuard = guard();
  if (bootGuard) bootGuard.hardReset();
  else window.location.reload();
}
