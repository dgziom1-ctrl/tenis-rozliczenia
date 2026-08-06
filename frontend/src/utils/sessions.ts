import { MONTHS } from '@/constants';
import type { HistoryEntry, MonthGroup } from '@/types/ui';

function getMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function groupSessionsByMonth(history: HistoryEntry[]): [string, { total: number; players: Record<string, number> }][] {
  const months: Record<string, { total: number; players: Record<string, number> }> = {};
  history.forEach(session => {
    const key = getMonthKey(session.datePlayed);
    if (!months[key]) months[key] = { total: 0, players: {} };
    months[key].total += 1;
    session.presentPlayers.forEach(playerName => {
      months[key].players[playerName] = (months[key].players[playerName] || 0) + 1;
    });
  });
  return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
}

export function groupHistoryByMonth(history: HistoryEntry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;
  for (const row of history) {
    const label = getMonthLabel(row.datePlayed);
    if (!current || current.label !== label) {
      current = { label, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
}

export function getAvailableSeasons(history: HistoryEntry[]): number[] {
  if (!history || history.length === 0) return [];
  const years = new Set<number>();
  history.forEach(s => {
    if (s.datePlayed) years.add(parseInt(s.datePlayed.slice(0, 4), 10));
  });
  return [...years].sort((a, b) => b - a);
}

export function filterHistoryByYear(history: HistoryEntry[], year: number | null): HistoryEntry[] {
  if (!year) return history;
  const prefix = String(year);
  return history.filter(s => s.datePlayed?.startsWith(prefix));
}
