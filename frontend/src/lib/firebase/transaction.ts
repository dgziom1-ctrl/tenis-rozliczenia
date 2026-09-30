import { runTransaction } from 'firebase/database';
import { dataRef } from './config';
import type { RawAppData, TransactionResult } from '@/types/domain';

const WRITE_TIMEOUT_MS = 12_000;

/**
 * Odrzucenie zapisu przez regułę biznesową (np. „Sesja z tą datą już istnieje”).
 * To spodziewany przebieg, a nie awaria — dlatego nie trafia do konsoli.
 */
class MutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MutationError';
  }
}

/** Przerywa transakcję z komunikatem przeznaczonym dla użytkownika. */
export function reject(message: string): never {
  throw new MutationError(message);
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Usuwa z zapisu `paidUntilWeek` — kursor „rozliczony do sesji X" z dawnej
 * wersji apki, który zerował koszt wcześniejszych sesji obok księgi wpłat.
 * Apka już go nie czyta, ale mutacje przepisują cały węzeł `appData`, więc bez
 * tego stary wpis przeżywałby każdy zapis i zostawał w bazie na zawsze.
 * Transakcja podmienia całą wartość węzła, więc pominięcie klucza go kasuje.
 */
function withoutLegacyFields(next: RawAppData): RawAppData {
  const { paidUntilWeek: _legacy, ...rest } = next as RawAppData & { paidUntilWeek?: unknown };
  return rest as RawAppData;
}

/** Komunikat po odmowie zapisu bez sieci — jeden, żeby nie rozjechał się między ścieżkami. */
const OFFLINE_MESSAGE =
  'Brak połączenia z internetem — zmiana nie została zapisana. Spróbuj ponownie, gdy wróci sieć.';

/**
 * Komunikat po odrzuceniu zapisu przez reguły bazy („Permission denied”).
 *
 * Reguły walidują CAŁY węzeł `appData`, a każda mutacja przepisuje go w całości
 * w jednej transakcji. Jedno pole, którego reguły nie znają, albo jedna wartość
 * spoza ich zakresu, blokuje więc nie jedną akcję, a wszystkie naraz — a SDK
 * zwraca wtedy surowe, angielskie „PERMISSION_DENIED: Permission denied”, które
 * nic nie mówi o przyczynie. Podmieniamy je na zdanie po polsku i logujemy
 * oryginał, żeby dalo się ustalić, o które pole chodziło.
 */
const PERMISSION_DENIED_MESSAGE =
  'Baza odrzuciła ten zapis (brak uprawnień) — reguły bezpieczeństwa nie zgadzają się z danymi, które zapisuje aplikacja. Zgłoś to administratorowi; odświeżenie strony nie pomoże.';

/** Czy błąd to odmowa zapisu przez reguły bazy (kod `PERMISSION_DENIED`). */
function isPermissionDenied(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'PERMISSION_DENIED'
    || (typeof message === 'string' && /permission[ _]?denied/i.test(message));
}

export async function withTransaction(
  fn: (current: RawAppData | null) => RawAppData,
  fallbackErrorMsg: string,
): Promise<TransactionResult> {
  /**
   * Bez sieci nie zaczynamy transakcji w ogóle.
   *
   * `runTransaction` wywołane offline nie kończy się, tylko zostaje w SDK jako
   * transakcja oczekująca. Dopóki wisi, Firebase wstrzymuje dla tego węzła dane
   * z serwera — po powrocie internetu aplikacja przestaje dostawać cokolwiek
   * i zostaje na pustym ekranie. Do tego taka transakcja potrafi zatwierdzić się
   * później, długo po tym, jak użytkownik zobaczył komunikat o niepowodzeniu.
   * Odmowa z góry jest uczciwsza i nie zostawia po sobie żadnego stanu.
   */
  if (isOffline()) {
    return { success: false, error: OFFLINE_MESSAGE };
  }

  try {
    await Promise.race([
      runTransaction(dataRef, (current: RawAppData | null) => withoutLegacyFields(fn(current))),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('__WRITE_TIMEOUT__')), WRITE_TIMEOUT_MS),
      ),
    ]);
    return { success: true };
  } catch (error) {
    if (error instanceof MutationError) {
      return { success: false, error: error.message };
    }

    // Odmowa reguł bazy: pokazujemy zdanie po polsku, a oryginał (z nazwą
    // odrzuconego pola, jeśli SDK ją poda) zostaje w konsoli dla administratora.
    if (isPermissionDenied(error)) {
      console.error('Zapis odrzucony przez reguły bazy:', error);
      return { success: false, error: PERMISSION_DENIED_MESSAGE };
    }

    console.error(error);

    // Sieć zniknęła już w trakcie zapisu. Transakcja nie dotarła do serwera,
    // więc ponowienie jest bezpieczne.
    if (isOffline()) {
      return { success: false, error: OFFLINE_MESSAGE };
    }

    // Przekroczony limit czasu NIE oznacza, że zapis się nie udał — przestajemy
    // tylko na niego czekać. Transakcja mogła zostać zatwierdzona na serwerze,
    // dlatego oznaczamy wynik jako niepewny i nie zachęcamy do ponowienia
    // (ponowione dopisanie wpłaty policzyłoby ją drugi raz).
    if (error instanceof Error && error.message === '__WRITE_TIMEOUT__') {
      return {
        success: false,
        indeterminate: true,
        error: 'Zapis trwa zbyt długo i nie znamy jego wyniku. Odśwież i sprawdź, czy zmiana się zapisała, zanim spróbujesz ponownie.',
      };
    }

    // Błędy walidacji rzucone wewnątrz transakcji (np. „Sesja z tą datą już istnieje”).
    return {
      success: false,
      error: error instanceof Error ? error.message : fallbackErrorMsg,
    };
  }
}
