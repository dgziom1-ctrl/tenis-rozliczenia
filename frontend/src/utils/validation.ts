// Walidacja danych wchodzących do bazy. Wszystko, co zapisujemy, przechodzi
// przez te funkcje — dzięki temu do księgi rozliczeń nigdy nie trafi NaN,
// Infinity, kwota ujemna ani wartość spoza rozsądnego zakresu.

/** Górny limit pojedynczej kwoty (zł). Zabezpiecza przed pomyłką w kwocie. */
const MAX_AMOUNT = 100_000;

/** Maksymalna liczba znaków w nazwie gracza. */
export const MAX_PLAYER_NAME_LENGTH = 40;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Kwota nadająca się do zapisania: skończona, nieujemna, w rozsądnym zakresie. */
export function isValidMoney(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= MAX_AMOUNT;
}

/** Jak `isValidMoney`, ale wymaga kwoty ostro większej od zera. */
export function isPositiveMoney(value: unknown): value is number {
  return isValidMoney(value) && value > 0;
}

/** Data w formacie YYYY-MM-DD, która faktycznie istnieje w kalendarzu. */
export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/** Nazwa gracza po przycięciu białych znaków, albo null gdy nieprawidłowa. */
export function normalizePlayerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PLAYER_NAME_LENGTH) return null;
  return trimmed;
}

/** Lista graczy bez duplikatów, pustych wpisów i wartości nie-tekstowych. */
export function normalizePlayerList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    const name = normalizePlayerName(entry);
    if (name) seen.add(name);
  }
  return [...seen];
}
