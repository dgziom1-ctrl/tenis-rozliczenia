import { readStorage, writeStorage, STORAGE_KEYS } from '@/utils/storage';
import { MAX_PLAYER_NAME_LENGTH } from '@/utils/validation';

/** Losowy identyfikator bez żadnych danych o użytkowniku. */
export function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    }
  } catch { /* spadamy do Math.random */ }
  return Array.from({ length: 20 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

let cachedDeviceId: string | null = null;

/**
 * Stałe, anonimowe ID urządzenia (localStorage). Bez magazynu (tryb prywatny)
 * ID żyje do końca karty — to nadal poprawna, tylko krótsza tożsamość.
 */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  let id = readStorage(STORAGE_KEYS.analyticsDevice);
  if (!id || id.length > 64) {
    id = randomId();
    writeStorage(STORAGE_KEYS.analyticsDevice, id);
  }
  cachedDeviceId = id;
  return id;
}

/** Jedno ID na uruchomienie aplikacji (odświeżenie strony = nowa sesja). */
export const SESSION_ID = randomId();

let cachedPlayer: string | null | undefined;

/** Imię gracza, jeśli to urządzenie kiedyś je podało (rejestracja powiadomień). */
export function getAnalyticsPlayer(): string | null {
  if (cachedPlayer === undefined) cachedPlayer = readStorage(STORAGE_KEYS.analyticsPlayer);
  return cachedPlayer;
}

export function setAnalyticsPlayer(name: string): void {
  const clean = name.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  if (!clean || clean === 'unknown') return;
  cachedPlayer = clean;
  writeStorage(STORAGE_KEYS.analyticsPlayer, clean);
}

export function isOptedOut(): boolean {
  return readStorage(STORAGE_KEYS.analyticsOptOut) === '1';
}

export function setOptOut(value: boolean): void {
  if (value) writeStorage(STORAGE_KEYS.analyticsOptOut, '1');
  else {
    try { localStorage.removeItem(STORAGE_KEYS.analyticsOptOut); } catch { /* brak magazynu */ }
  }
}
