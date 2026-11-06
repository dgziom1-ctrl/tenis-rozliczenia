import type { HistoryEntry } from '@/types/ui';

export type GridCellState = 'present' | 'missed' | 'none';

export interface GridCell {
  key: string;
  col: number;
  row: number;
  date: string;
  state: GridCellState;
  latest: boolean;
}

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const isoDate = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
// 1970-01-01 to czwartek, więc (dzień + 3) % 7 daje 0 = poniedziałek.
const weekdayOf = (day: number) => (day + 3) % 7;

/**
 * Układa sesje w siatkę tygodni (kolumny) × dni tygodnia (wiersze).
 * Okno kończy się na tygodniu ostatniej sesji, nie na „dziś", żeby przerwa
 * wakacyjna nie wyzerowała widoku. Tylko odczyt — niczego nie liczy z kosztów.
 */
export function buildAttendanceGrid(history: HistoryEntry[], playerName: string, weeks = 20): GridCell[] {
  const dated = history.filter(s => s.datePlayed);
  if (dated.length === 0) return [];

  const byDay = new Map<number, boolean>();
  let lastDay = -Infinity;
  let lastAttendedDay = -Infinity;
  for (const s of dated) {
    const d = dayNumber(s.datePlayed);
    if (Number.isNaN(d)) continue;
    const here = s.presentPlayers.includes(playerName);
    byDay.set(d, (byDay.get(d) ?? false) || here);
    lastDay = Math.max(lastDay, d);
    if (here) lastAttendedDay = Math.max(lastAttendedDay, d);
  }
  if (!Number.isFinite(lastDay)) return [];

  const endWeekStart = lastDay - weekdayOf(lastDay);
  const startWeekStart = endWeekStart - (weeks - 1) * 7;

  const cells: GridCell[] = [];
  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const day = startWeekStart + col * 7 + row;
      const attended = byDay.get(day);
      cells.push({
        key: `${col}-${row}`,
        col, row,
        date: isoDate(day),
        state: attended === undefined ? 'none' : attended ? 'present' : 'missed',
        latest: day === lastAttendedDay,
      });
    }
  }
  return cells;
}
