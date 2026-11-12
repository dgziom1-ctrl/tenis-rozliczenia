/**
 * Bezpieczny dostęp do `localStorage`.
 *
 * W trybie prywatnym, przy zablokowanych danych witryny albo pełnym magazynie
 * przeglądarka rzuca wyjątkiem już przy samym odczycie. Preferencje interfejsu
 * (motyw, odrzucone banery) nie mogą przez to wywrócić aplikacji — brak magazynu
 * znaczy tylko, że nic nie zostanie zapamiętane.
 *
 * Moduły z własną logiką awarii (pamięć danych w `lib/firebase`, nadzór wydania
 * w `buildVersion`) obsługują magazyn same.
 */

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Zwraca `false`, gdy zapisu nie dało się wykonać. */
export function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Klucze czytane i zapisywane w więcej niż jednym module. Wpisany ręcznie
 * w dwóch miejscach klucz rozjeżdża się przy pierwszej zmianie nazwy — a wtedy
 * baner push przestaje widzieć zarejestrowane urządzenie.
 */
export const STORAGE_KEYS = {
  /** Skrót tokenu FCM tego urządzenia — klucz wpisu w `fcmTokens`. */
  pushTokenKey: 'push-token-key',
} as const;
