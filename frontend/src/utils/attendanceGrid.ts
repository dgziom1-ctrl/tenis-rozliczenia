import type { HistoryEntry } from '@/types/ui';

export type GridCellState = 'present' | 'missed' | 'none';

export interface GridCell {
  key: string;
  col: number;
  row: number;
  /** Data sesji z tego tygodnia, a gdy jej nie było: poniedziałek tygodnia. */
  date: string;
  state: GridCellState;
  latest: boolean;
}

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const isoDate = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
// 1970-01-01 to czwartek, więc (dzień + 3) % 7 daje 0 = poniedziałek.
const weekStartOf = (day: number) => day - ((day + 3) % 7);

/**
 * Jedna komórka na tydzień (grupa gra raz w tygodniu), ułożona rzędami od
 * najstarszego do najnowszego, `perRow` tygodni w rzędzie.
 * Tydzień bez sesji (wakacje, odwołane granie) to `none`, nie nieobecność.
 * Okno kończy się na tygodniu ostatniej sesji, nie na „dziś". Tylko odczyt.
 */
export function buildAttendanceGrid(
  history: HistoryEntry[],
  playerName: string,
  weeks = 26,
  perRow = 13,
): GridCell[] {
  const byWeek = new Map<number, { attended: boolean; date: string }>();
  let lastWeek = -Infinity;
  let lastAttendedWeek = -Infinity;
  for (const s of history) {
    if (!s.datePlayed) continue;
    const day = dayNumber(s.datePlayed);
    if (Number.isNaN(day)) continue;
    const week = weekStartOf(day);
    const here = s.presentPlayers.includes(playerName);
    const prev = byWeek.get(week);
    byWeek.set(week, { attended: (prev?.attended ?? false) || here, date: s.datePlayed });
    lastWeek = Math.max(lastWeek, week);
    if (here) lastAttendedWeek = Math.max(lastAttendedWeek, week);
  }
  if (!Number.isFinite(lastWeek)) return [];

  const startWeek = lastWeek - (weeks - 1) * 7;
  return Array.from({ length: weeks }, (_, i) => {
    const week = startWeek + i * 7;
    const entry = byWeek.get(week);
    return {
      key: `w${i}`,
      col: i % perRow,
      row: Math.floor(i / perRow),
      date: entry?.date ?? isoDate(week),
      state: entry === undefined ? 'none' : entry.attended ? 'present' : 'missed',
      latest: week === lastAttendedWeek,
    };
  });
}
