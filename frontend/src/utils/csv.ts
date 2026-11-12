import { SPORT_LABEL } from '@/constants';
import type { HistoryEntry } from '@/types/ui';

export type CsvCell = string | number | null | undefined;

/**
 * Ochrona przed CSV injection: arkusz kalkulacyjny wykonuje komórkę zaczynającą
 * się od znaku formuły („=”, „+”, „-”, „@”), także po wiodących spacjach, oraz
 * od tabulatora/powrotu karetki. Apostrof na początku każe traktować ją jak tekst.
 * Imiona graczy pochodzą z publicznej bazy, więc nie można im ufać.
 */
export function sanitizeCsvCell(value: CsvCell): string {
  const text = String(value ?? '');
  return /^[\t\r]/.test(text) || /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}

/** Wiersze → CSV z każdą komórką w cudzysłowach (cudzysłów w treści podwojony). */
export function toCsv(rows: CsvCell[][]): string {
  return rows
    .map(row => row.map(cell => `"${sanitizeCsvCell(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

const SESSION_COLUMNS = [
  'Data', 'Sport', 'Koszt całkowity', 'Koszt rakiet', 'Bez karty (zł/os.)',
  'Z kartą (zł/os.)', 'Liczba graczy', 'Obecni', 'Multisport',
];

/** Zestawienie sesji w kolejności, w jakiej widzi je użytkownik. */
export function buildSessionsCsv(sessions: HistoryEntry[]): string {
  return toCsv([
    SESSION_COLUMNS,
    ...sessions.map(s => [
      s.datePlayed,
      (SPORT_LABEL[s.sport] ?? 'Ping-Pong').toLowerCase(),
      s.totalCost,
      s.racketCost ?? 0,
      s.costPerPerson?.toFixed(2) ?? '',
      s.costPerPersonMulti?.toFixed(2) ?? '',
      s.presentPlayers.length,
      s.presentPlayers.join('; '),
      s.multisportPlayers.join('; '),
    ]),
  ]);
}

/** Nazwa pliku bez znaków, których nie przyjmie system plików. */
export function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_');
}

/**
 * Pobranie CSV w przeglądarce. BOM na początku sprawia, że Excel czyta polskie
 * znaki jako UTF-8. Adres obiektu zwalniamy z opóźnieniem — zwolniony tuż po
 * `click()` potrafi przerwać pobieranie (Safari, starszy Firefox).
 */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  try {
    const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
