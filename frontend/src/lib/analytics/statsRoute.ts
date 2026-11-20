/**
 * Ukryta ścieżka panelu statystyk (`/x/<VITE_STATS_PATH>`).
 *
 * Slug trafia do bundla, więc to ukrycie, a nie zabezpieczenie — dane chroni
 * klucz sprawdzany przez funkcję `stats`. Bez skonfigurowanego sluga (lub przy
 * zbyt krótkim) trasy nie ma wcale i wszystko trafia na zwykłe przekierowanie.
 */
const MIN_SLUG_LENGTH = 8;

function readSlug(): string | null {
  const raw = String(import.meta.env.VITE_STATS_PATH ?? '').trim().replace(/^\/+|\/+$/g, '');
  return /^[A-Za-z0-9_-]+$/.test(raw) && raw.length >= MIN_SLUG_LENGTH ? raw : null;
}

const SLUG = readSlug();

/** Pełna ścieżka panelu albo `null`, gdy panel jest wyłączony. */
export const STATS_PATH: string | null = SLUG ? `/x/${SLUG}` : null;

export function isStatsPath(pathname: string): boolean {
  return STATS_PATH !== null && pathname === STATS_PATH;
}
