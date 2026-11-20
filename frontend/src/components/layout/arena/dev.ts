import { isSport } from '@/constants';
import type { Sport } from '@/types/domain';

/*
 * Narzędzia do dopracowywania areny — działają wyłącznie w `npm run dev`.
 * W paczce produkcyjnej `import.meta.env.DEV` jest stałą `false`, więc
 * bundler wycina te gałęzie razem z odczytem adresu.
 *
 *   ?arena=padel         — wymusza dyscyplinę niezależnie od ostatniej sesji
 *   ?arena=padel&t=0.37  — zamraża scenę w danym momencie cyklu (0–1)
 *   window.__arena       — średni koszt klatki bieżącej sceny (ms)
 */

function param(name: string): string | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(name);
}

export function devArenaSport(): Sport | null {
  const value = param('arena');
  return isSport(value) ? value : null;
}

export function devArenaFreeze(): number | null {
  const raw = param('t');
  if (raw === null || raw.trim() === '') return null;
  const t = Number(raw);
  return Number.isFinite(t) ? ((t % 1) + 1) % 1 : null;
}

export function publishArenaStats(stats: { sport: Sport; frameMs: number; fps: number }) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  (window as Window & { __arena?: typeof stats }).__arena = stats;
}
