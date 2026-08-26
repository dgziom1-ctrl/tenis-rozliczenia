import type { NormalizedData } from '@/types/domain';

/**
 * Ostatni poprawny stan danych, zapamiętany na urządzeniu.
 *
 * Bez tego każde uruchomienie zaczyna od zera i czeka na bazę. Gdy sieci nie ma
 * albo Firebase długo wstaje, użytkownik patrzy na puste listy i ma prawo uznać,
 * że aplikacja jest zepsuta. Z zapamiętanym stanem apka otwiera się od razu
 * z ostatnimi znanymi danymi, a baner nad treścią mówi, że nie są świeże.
 *
 * To pamięć podręczna, nie źródło prawdy: nadpisuje ją każdy snapshot z bazy,
 * a przy odczycie wszystko jest sprawdzane, bo uszkodzony wpis nie może stać się
 * nowym sposobem na zepsucie startu.
 */

const STORAGE_KEY = 'cyber-ponk-data-snapshot';

/**
 * Zmieniaj przy każdej zmianie kształtu `NormalizedData`. Inaczej po wdrożeniu
 * nowa wersja próbowałaby czytać stan zapisany przez starą.
 */
const SCHEMA_VERSION = 1;

/**
 * Zapis powyżej tego rozmiaru pomijamy. `localStorage` ma zwykle 5 MB na origin,
 * a przekroczenie limitu rzuca wyjątkiem — nie chcemy, by rozrost historii
 * kiedykolwiek zaczął psuć zapis czegokolwiek innego.
 */
const MAX_BYTES = 1_000_000;

interface StoredSnapshot {
  version: number;
  savedAt: number;
  data: NormalizedData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Sprawdza kształt odczytanego stanu.
 *
 * Wystarczy potwierdzić typy kolekcji: dalej i tak przechodzi przez
 * `normalizeRawData`, które uzupełnia braki, a `buildUIData` woła się w bloku
 * `try` na wypadek, gdyby wartości w środku były nie te.
 */
function looksLikeData(value: unknown): value is NormalizedData {
  if (!isRecord(value)) return false;
  return Array.isArray(value.players)
    && Array.isArray(value.weeks)
    && isRecord(value.payments ?? {});
}

export function saveSnapshot(data: NormalizedData): void {
  try {
    const payload: StoredSnapshot = { version: SCHEMA_VERSION, savedAt: Date.now(), data };
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_BYTES) return;
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Tryb prywatny albo pełny magazyn — apka działa dalej, tylko bez pamięci.
  }
}

/** Ostatni zapamiętany stan albo `null`, gdy go nie ma lub jest podejrzany. */
export function loadSnapshot(): NormalizedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== SCHEMA_VERSION) return null;
    if (!looksLikeData(parsed.data)) return null;

    return parsed.data;
  } catch {
    // Uszkodzony wpis traktujemy jak jego brak — start nie może się o to wywrócić.
    return null;
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* brak dostępu do magazynu */
  }
}
