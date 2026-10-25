#!/usr/bin/env node
/**
 * Bramka kontrastu WCAG 2.2 AA dla tokenów motywu.
 *
 * axe sprawdza kontrast tylko na tym, co akurat wyrenderowano — w jednym
 * motywie, na jednym ekranie. Ten skrypt czyta `index.css`, składa kolory
 * półprzezroczystego szkła na realnym tle i sprawdza całą matrycę
 * tekst × powierzchnia w obu motywach. Dzięki temu regresja typu „ktoś
 * przyciemnił akcent, a etykiety w trybie jasnym spadły do 3:1” wychodzi
 * w `npm run verify`, a nie dopiero na telefonie w słońcu.
 *
 * Progi (WCAG 2.2):
 *  - 4.5:1 — zwykły tekst (1.4.3),
 *  - 3:1   — tekst duży (≥ 24 px lub ≥ 18,66 px bold) i elementy interfejsu (1.4.11).
 *
 * Tokeny z listy `LARGE_ONLY` wolno używać wyłącznie do dużych napisów
 * i elementów dekoracyjnych. Jeśli potrzebujesz nimi opisać treść — użyj
 * `--co-dim`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');

const NORMAL_TEXT = 4.5;
const LARGE_TEXT = 3;
const UI_COMPONENT = 3;

// ── 1. Odczyt tokenów ────────────────────────────────────────────────
/**
 * Bloki tokenów leżą w pliku na poziomie 0 wcięcia (`:root {` i
 * `body.theme-light {`). Wersje wewnątrz `@media` są wcięte — celowo je
 * pomijamy, bo opisują nadpisania preferencji, a nie motyw bazowy.
 */
function readTokenBlock(selector) {
  const start = css.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`, 'm'));
  if (start === -1) throw new Error(`index.css — brak bloku ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = css.slice(open + 1, end);
  const tokens = {};
  for (const match of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const themes = {
  dark: readTokenBlock(':root'),
  light: readTokenBlock('body.theme-light'),
};

// ── 2. Kolory ────────────────────────────────────────────────────────
function parseColor(value) {
  const input = value.trim().toLowerCase();
  const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split('').map(ch => ch + ch).join('')
      : hex[1];
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = input.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

/** Kolor półprzezroczysty nałożony na nieprzezroczyste tło. */
function composite(overlay, base) {
  const a = overlay.a;
  return {
    r: overlay.r * a + base.r * (1 - a),
    g: overlay.g * a + base.g * (1 - a),
    b: overlay.b * a + base.b * (1 - a),
    a: 1,
  };
}

function resolve(tokenName, theme) {
  const value = themes[theme][tokenName];
  if (value === undefined) throw new Error(`motyw ${theme} — brak tokenu --${tokenName}`);
  const color = parseColor(value);
  if (!color) throw new Error(`motyw ${theme} — nie umiem odczytać --${tokenName}: ${value}`);
  return color;
}

function luminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Powierzchnia: `null` = nieprzezroczysty token, tablica = warstwy od spodu. */
const SURFACES = {
  void: ['co-void'],
  dark: ['co-dark'],
  panel: ['co-panel'],
  raised: ['co-raised'],
  'surface-2': ['co-surface-2'],
  'glass/void': ['co-void', 'co-glass'],
  'glass-hi/void': ['co-void', 'co-glass-hi'],
};

function surfaceColor(layers, theme) {
  let base = resolve(layers[0], theme);
  for (const layer of layers.slice(1)) {
    const color = resolve(layer, theme);
    base = color.a < 1 ? composite(color, base) : color;
  }
  return base;
}

// ── 3. Co sprawdzamy ─────────────────────────────────────────────────
/** Tekst zwykły — każdy z tych tokenów bywa etykietą 12–14 px. */
const TEXT_TOKENS = [
  'co-text', 'co-text-hi', 'co-dim',
  'co-cyan', 'co-cyan-mid', 'co-rose', 'co-amber', 'co-green', 'co-gold', 'co-ice',
  'co-silver', 'co-bronze', 'co-pink',
];

/**
 * Tokeny tylko do dużych napisów i dekoracji. `dim2` to celowo najsłabszy
 * stopień szarości — na `--co-raised` ma 3,4:1, więc 12-pikselowa etykieta
 * nim zrobiona łamie AA. Do treści jest `--co-dim`.
 */
const LARGE_ONLY = ['co-dim2'];

/**
 * Kolory rang są tekstem (nazwa rangi, procent) — muszą przejść 4,5:1 jak
 * zwykły tekst, na każdej powierzchni i w obu motywach. Wcześniej były
 * literałami dobranymi pod ciemne tło: w trybie jasnym złoto miało 3,3:1,
 * a „duch” 3,5:1.
 */
const RANK_TOKENS = ['rank-legenda', 'rank-mistrz', 'rank-weteran', 'rank-staly', 'rank-gosc', 'rank-duch'];

/** Akcent na własnym tle tintowanym (chipy statusów). */
const TINT_PAIRS = [
  ['co-cyan', 'co-cyan-dim'],
  ['co-rose', 'co-rose-dim'],
  ['co-amber', 'co-amber-dim'],
  ['co-green', 'co-green-dim'],
  ['co-gold', 'co-gold-dim'],
];

/** Kolory „na wypełnieniu” — muszą być czytelne w obu motywach. */
const ON_PAIRS = [
  { fg: 'co-on-rose', bg: 'co-rose', min: NORMAL_TEXT, note: 'przycisk destrukcyjny' },
  { fg: 'co-on-accent', bg: 'co-cyan', min: NORMAL_TEXT, note: 'przycisk główny i skip link' },
  { fg: 'co-on-accent', bg: 'co-cyan-mid', min: NORMAL_TEXT, note: 'przycisk główny (gradient)' },
];

const errors = [];
const rows = [];

for (const [theme, tokens] of Object.entries(themes)) {
  if (!tokens['co-on-rose']) errors.push(`motyw ${theme} — brak tokenu --co-on-rose`);

  for (const [surfaceName, layers] of Object.entries(SURFACES)) {
    const background = surfaceColor(layers, theme);

    for (const token of TEXT_TOKENS) {
      const ratio = contrast(resolve(token, theme), background);
      rows.push({ theme, token, surface: surfaceName, ratio, min: NORMAL_TEXT });
      if (ratio < NORMAL_TEXT) {
        errors.push(`motyw ${theme}: --${token} na ${surfaceName} = ${ratio.toFixed(2)}:1 (< 4.5:1)`);
      }
    }

    for (const token of RANK_TOKENS) {
      const ratio = contrast(resolve(token, theme), background);
      rows.push({ theme, token, surface: surfaceName, ratio, min: NORMAL_TEXT });
      if (ratio < NORMAL_TEXT) {
        errors.push(`motyw ${theme}: --${token} na ${surfaceName} = ${ratio.toFixed(2)}:1 (< 4.5:1)`);
      }
    }

    for (const token of LARGE_ONLY) {
      const ratio = contrast(resolve(token, theme), background);
      rows.push({ theme, token, surface: surfaceName, ratio, min: LARGE_TEXT });
      if (ratio < LARGE_TEXT) {
        errors.push(`motyw ${theme}: --${token} na ${surfaceName} = ${ratio.toFixed(2)}:1 (< 3:1, nawet dla dużego tekstu)`);
      }
    }
  }

  for (const [fg, bg] of TINT_PAIRS) {
    const ratio = contrast(resolve(fg, theme), resolve(bg, theme));
    rows.push({ theme, token: fg, surface: bg, ratio, min: NORMAL_TEXT });
    if (ratio < NORMAL_TEXT) {
      errors.push(`motyw ${theme}: --${fg} na --${bg} = ${ratio.toFixed(2)}:1 (< 4.5:1)`);
    }
  }

  for (const pair of ON_PAIRS) {
    const ratio = contrast(resolve(pair.fg, theme), resolve(pair.bg, theme));
    rows.push({ theme, token: pair.fg, surface: pair.bg, ratio, min: pair.min });
    if (ratio < pair.min) {
      errors.push(`motyw ${theme}: --${pair.fg} na --${pair.bg} = ${ratio.toFixed(2)}:1 (< ${pair.min}:1) — ${pair.note}`);
    }
  }

  // Pierścień fokusu to element interfejsu — próg 3:1 (WCAG 1.4.11).
  for (const surfaceName of ['void', 'panel']) {
    const ratio = contrast(resolve('co-cyan', theme), surfaceColor(SURFACES[surfaceName], theme));
    rows.push({ theme, token: 'focus', surface: surfaceName, ratio, min: UI_COMPONENT });
    if (ratio < UI_COMPONENT) {
      errors.push(`motyw ${theme}: pierścień fokusu na ${surfaceName} = ${ratio.toFixed(2)}:1 (< 3:1)`);
    }
  }
}

// ── 4. Raport ────────────────────────────────────────────────────────
const lowest = [...rows].sort((a, b) => a.ratio - b.ratio).slice(0, 5);
console.log('Kontrast tokenów (najniższe 5 par):');
for (const row of lowest) {
  const status = row.ratio >= row.min ? 'OK ' : 'BŁĄD';
  console.log(`  ${status} ${row.theme.padEnd(5)} --${row.token} na ${row.surface}: ${row.ratio.toFixed(2)}:1 (min ${row.min})`);
}

if (errors.length > 0) {
  console.error('\n✗ Audyt kontrastu: znaleziono problemy\n');
  errors.forEach(error => console.error(`  • ${error}`));
  console.error('\nProgi: 4.5:1 dla tekstu zwykłego, 3:1 dla dużego tekstu i elementów interfejsu.');
  console.error('Patrz DESIGN_SYSTEM.md → „Kontrast i motywy”.\n');
  process.exit(1);
}

console.log(`\n✓ Audyt kontrastu: ${rows.length} par w dwóch motywach spełnia WCAG AA.`);
