#!/usr/bin/env node
/**
 * Automatyczny audyt typografii, którego axe nie widzi.
 *
 * axe sprawdza kontrast i role, ale nie wie, że tekst SVG o `font-size: 13`
 * został pomniejszony przez `viewBox` do 7 px. Ten skrypt pilnuje trzech rzeczy,
 * które dały się zepsuć bez żadnego błędu w konsoli:
 *
 *  1. żaden jawny `font-size` / `fontSize` w CSS i TSX nie schodzi poniżej 12 px,
 *  2. etykiety wykresów mają co najmniej 12 px i wykres mierzy kontener,
 *     zamiast skalować stały viewBox,
 *  3. oba wykresy korzystają ze wspólnej stałej rozmiaru etykiet.
 *
 * Reszta (zoom 200%, czytniki, fizyczny telefon) zostaje w ręcznej checkliście
 * `ACCESSIBILITY.md` — automat tego nie zastąpi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const errors = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return walk(absolute);
    }
    return /\.(css|ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

// ── 1. Podłoga 12 px w CSS i stylach inline ─────────────────────────
const floor = /(?:font-size|fontSize)\s*:\s*['"]?([\d.]+)(rem|px)/g;
for (const absolute of walk(srcRoot)) {
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    // Komentarze w CSS często przytaczają starą wartość; nie są regułą.
    if (/^\s*(\/\*|\*|\/\/)/.test(line)) return;
    for (const match of line.matchAll(floor)) {
      const value = Number(match[1]);
      const px = match[2] === 'rem' ? value * 16 : value;
      if (px > 0 && px < 12) {
        errors.push(`${relative}:${index + 1} — ${match[0]} (${px} px) < 12 px`);
      }
    }
  });
}

// ── 2. Wykresy: stała etykiety i pomiar kontenera ───────────────────
const chart = read('src/utils/chart.ts');
const label = chart.match(/CHART_LABEL_SIZE\s*=\s*(\d+)/);
if (!label) {
  errors.push('src/utils/chart.ts — brak CHART_LABEL_SIZE');
} else if (Number(label[1]) < 12) {
  errors.push(`src/utils/chart.ts — CHART_LABEL_SIZE = ${label[1]} px < 12 px`);
}

for (const file of ['src/components/attendance/RankingHistoryChart.tsx', 'src/components/history/AttendanceTrendChart.tsx']) {
  const source = read(file);
  if (!source.includes('useElementWidth')) {
    errors.push(`${file} — wykres nie mierzy szerokości kontenera (brak useElementWidth)`);
  }
  if (!source.includes('CHART_LABEL_SIZE')) {
    errors.push(`${file} — wykres nie używa wspólnej stałej rozmiaru etykiet`);
  }
}

if (errors.length > 0) {
  console.error('\n✗ Audyt typografii: znaleziono problemy\n');
  errors.forEach(error => console.error(`  • ${error}`));
  console.error('\nPatrz ACCESSIBILITY.md → „Typografia i wykresy”.\n');
  process.exit(1);
}

console.log('✓ Audyt typografii: brak font-size < 12 px, wykresy mierzą kontener.');
