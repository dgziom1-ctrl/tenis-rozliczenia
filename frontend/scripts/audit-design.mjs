#!/usr/bin/env node
/**
 * Bramka „design floor” — automatyczna część DESIGN.md.
 *
 * Zasady wzięte z 12 repozytoriów opisanych w `../DESIGN-SKILLS.md`, ale
 * zawężone do tego, co da się sprawdzić statycznie i co nie wymaga zgadywania
 * intencji projektanta. Najwięcej naruszeń w tym projekcie nie było widocznych
 * w axe ani w `npm run audit:contrast`: animacje `width` w pięciu paskach,
 * `top` w keyframes i `overflow-x: hidden` na <body>.
 *
 * Sprawdza:
 *   1. zakaz `transition: all` oraz animowania width/height/top/left/margin/padding,
 *   2. `overflow-x: clip` zamiast `hidden`, brak `100vw`,
 *   3. obecność `:focus-visible`, `prefers-reduced-motion`,
 *      `prefers-reduced-transparency` i `prefers-contrast`,
 *   4. kolory i kroje w komponentach wyłącznie przez tokeny `var(--…)`.
 *
 * Świadome wyjątki (waivers) są jawne w kodzie poniżej, nie w komentarzach
 * przy naruszeniu. Reszta dostępności i kontrastu zostaje w `audit:a11y`,
 * `audit:contrast` i w testach komponentów.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return walk(absolute);
    }
    return /\.(css|ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

/** Komentarze często cytują stare wartości („był tu #FFA000”) — nie są kodem. */
function stripComments(source, extension) {
  let text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (extension !== '.css') text = text.replace(/^\s*\/\/.*$/gm, '');
  return text;
}

const files = walk(srcRoot).map((absolute) => {
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  const extension = path.extname(absolute);
  const raw = fs.readFileSync(absolute, 'utf8');
  return { relative, extension, raw, code: stripComments(raw, extension) };
});

const css = files.find((file) => file.relative === 'src/index.css')?.code ?? '';
if (!css) errors.push('src/index.css — nie znaleziono arkusza tokenów.');

// ── 1. Ruch wyłącznie na transform/opacity ──────────────────────────────
const LAYOUT_PROPS = /\b(width|height|top|left|margin|padding)\b/;
const KEYFRAME_LAYOUT = /(?:^|[;{\s])(width|height|top|left|margin|padding)\s*:/m;
/**
 * Wyciągamy samą wartość deklaracji. Sprawdzanie całej linii dawało fałszywe
 * trafienia: w jednym obiekcie stylów `padding: 8px` stało obok
 * `transition: color .15s`, a `width: 36` obok `transition: background`.
 */
const TRANSITION_VALUE = /\btransition(?:-property|Property|-duration|-delay)?\s*:\s*(?:['"`]([^'"`]*)['"`]|([^;}\n]+))/g;

for (const file of files) {
  file.code.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(TRANSITION_VALUE)) {
      const value = (match[1] ?? match[2] ?? '').trim();
      if (/^all\b/.test(value)) {
        errors.push(`${file.relative}:${index + 1} — \`transition: all\` (Hallmark floor 2)`);
      }
      if (LAYOUT_PROPS.test(value)) {
        errors.push(
          `${file.relative}:${index + 1} — transition animuje layout: ${value.slice(0, 90)}`,
        );
      }
    }
    if (/transition-all/.test(line)) {
      errors.push(`${file.relative}:${index + 1} — klasa Tailwind \`transition-all\``);
    }
  });
}

// Keyframes: tylko wnętrze bloku @keyframes, nie cały arkusz (`.sr-only`
// poprawnie używa width: 1px jako techniki ukrywania, nie jako animacji).
for (const file of files.filter((f) => f.extension === '.css')) {
  for (const match of file.code.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    for (let i = start; i < file.code.length && depth > 0; i += 1) {
      if (file.code[i] === '{') depth += 1;
      if (file.code[i] === '}') depth -= 1;
      end = i;
    }
    const body = file.code.slice(start, end);
    if (KEYFRAME_LAYOUT.test(body)) {
      errors.push(`${file.relative} — @keyframes ${match[1]} animuje właściwość layoutu`);
    }
  }
}

// ── 2. Przewijanie poziome ──────────────────────────────────────────────
for (const file of files) {
  if (/overflow-x\s*:\s*hidden/.test(file.code)) {
    errors.push(`${file.relative} — overflow-x: hidden tworzy kontener przewijania; użyj clip`);
  }
  if (/\b100vw\b/.test(file.code)) {
    errors.push(`${file.relative} — 100vw ignoruje scrollbar; użyj 100% lub clip`);
  }
}
if (css && !/overflow-x\s*:\s*clip/.test(css)) {
  errors.push('src/index.css — brak overflow-x: clip na html/body');
}

// ── 3. Stany i preferencje użytkownika ──────────────────────────────────
const REQUIRED_CSS = [
  [':focus-visible', 'brak reguły :focus-visible (Hallmark floor 6)'],
  ['prefers-reduced-motion: reduce', 'brak fallbacku prefers-reduced-motion'],
  ['scroll-behavior: auto', 'płynne przewijanie nie jest wyłączane przy reduced motion'],
  ['prefers-reduced-transparency: reduce', 'brak fallbacku dla ograniczonej przezroczystości'],
  ['prefers-contrast: more', 'brak wariantu wysokiego kontrastu'],
];
for (const [needle, message] of REQUIRED_CSS) {
  if (css && !css.includes(needle)) errors.push(`src/index.css — ${message}`);
}

// ── 4. Kolory i kroje tylko z tokenów ───────────────────────────────────
/**
 * Waivers:
 * - BrandMark to zasób marki (gradient logo), świadomie poza motywem —
 *   DESIGN_SYSTEM.md §1 dopuszcza ten wyjątek.
 * - ArenaCanvas deklaruje fallbacki kolorów w jednym bloku `const P = {…}`;
 *   w przeglądarce zawsze wygrywają tokeny z getComputedStyle.
 * - index.css jest arkuszem tokenów: literały w :root i w keyframes to
 *   źródło prawdy, nie ich użycie (kontrast pilnuje audit:contrast).
 * - constants/colors.ts to warstwa prymitywów (paleta tożsamości graczy),
 *   opisana w DESIGN_SYSTEM.md §1; komponenty czytają ją przez getPlayerColor.
 * - hooks/useTheme.ts wpisuje konkretny kolor do <meta name="theme-color"> —
 *   przeglądarka nie rozwiąże tam `var()`.
 */
const COLOR_ALLOWLIST = new Set([
  'src/components/common/BrandMark.tsx',
  'src/constants/colors.ts',
  'src/hooks/useTheme.ts',
]);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_LITERAL = /\brgba?\(\s*\d/;
const FONT_LITERAL = /fontFamily\s*:\s*['"](?!var\()/;

for (const file of files) {
  if (file.extension === '.css' || COLOR_ALLOWLIST.has(file.relative)) continue;

  let code = file.code;
  if (file.relative === 'src/components/layout/ArenaCanvas.tsx') {
    const start = code.indexOf('const P = {');
    const end = code.indexOf('};', start + 1);
    if (start !== -1 && end !== -1) {
      code = `${code.slice(0, start)}/* canvas palette fallback */${code.slice(end + 2)}`;
    }
  }

  code.split(/\r?\n/).forEach((line, index) => {
    const hex = line.match(HEX);
    if (hex) {
      errors.push(`${file.relative}:${index + 1} — literał koloru ${hex.join(', ')}; użyj var(--co-*)`);
    }
    if (RGB_LITERAL.test(line)) {
      errors.push(`${file.relative}:${index + 1} — literał rgb()/rgba(); użyj tokenu`);
    }
    if (FONT_LITERAL.test(line)) {
      errors.push(`${file.relative}:${index + 1} — krój wpisany wprost; użyj var(--font-*)`);
    }
  });
}

if (errors.length > 0) {
  console.error('\n✗ Audyt design floor: znaleziono problemy\n');
  errors.forEach((error) => console.error(`  • ${error}`));
  console.error('\nPatrz DESIGN.md → „Do’s and Don’ts” oraz DESIGN-SKILLS.md.\n');
  process.exit(1);
}

console.log(
  `✓ Design floor: ruch tylko na transform/opacity, clip zamiast hidden, tokeny kolorów i krojów, stany a11y obecne (${files.length} plików).`,
);
