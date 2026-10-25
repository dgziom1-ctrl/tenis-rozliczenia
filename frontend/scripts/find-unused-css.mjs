/**
 * Pilnuje dwóch stron kontraktu CSS ↔ komponenty:
 *
 *  1. `src/index.css` nie deklaruje klasy ani `@keyframes`, których nikt nie używa,
 *  2. komponent nie podaje w `animation:` nazwy, której nie ma w arkuszu.
 *
 * Punkt 2 powstał po usterce easter egga: `Header` ustawiał
 * `animation: confettiBurst …`, ale reguły `@keyframes confettiBurst` nigdy nie
 * dopisano do arkusza. TypeScript tego nie widzi, a przeglądarka po cichu
 * odrzuca całą deklarację — konfetti pojawiało się i stało w miejscu.
 *
 * Selektory składane w czasie działania (np. `card-stagger-${n}`) nigdy nie
 * występują w źródle dosłownie, więc są w DYNAMIC_CLASSES.
 */
import fs from 'node:fs';
import path from 'node:path';

const CSS_FILE = 'src/index.css';
const DYNAMIC_CLASSES = [/^card-stagger-[1-6]$/];

const css = fs.readFileSync(CSS_FILE, 'utf8');

const classes = new Set();
for (const m of css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) classes.add(m[1]);

const keyframes = new Set();
for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) keyframes.add(m[1]);

const sourceFiles = ['index.html'];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p);
    } else if (/\.(tsx|ts|jsx|js|html)$/.test(entry.name)) {
      sourceFiles.push(p);
    }
  }
})('src');

const source = sourceFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const unusedClasses = [...classes]
  .filter((c) => !DYNAMIC_CLASSES.some((re) => re.test(c)))
  .filter((c) => !source.includes(c))
  .sort();

// A keyframes name counts as used when referenced from CSS (outside its own
// declaration) or from an inline `animation` style in the source.
const cssBody = css.replace(/@keyframes\s+[\w-]+/g, '');
const unusedKeyframes = [...keyframes]
  .filter((k) => !cssBody.includes(k) && !source.includes(k))
  .sort();

// ── Nazwy animacji podawane z komponentów ──────────────────────────
// Bierzemy wyłącznie literały z linii, w których ustawiane jest `animation:`
// (także warianty warunkowe: `animation: x > 0 ? 'nazwa 3s …' : 'none'`).
// Wartość liczy się jako nazwa, gdy po niej następuje czas (`3s`, `0.4s`).
const ANIMATION_KEYWORDS = new Set(['none', 'inherit', 'initial', 'unset', 'revert', 'var']);
const missingKeyframes = [];

for (const file of sourceFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const at = line.indexOf('animation:');
    if (at === -1) return;
    for (const match of line.slice(at).matchAll(/(['"`])([^'"`]*)\1/g)) {
      const value = match[2].trim();
      // Po nazwie musi przyjść czas — albo wpisany wprost (`3s`), albo wstawiony
      // z JS (`${piece.dur}s`). Sam wyraz bez czasu to zwykły tekst, nie animacja.
      const name = value.match(/^([a-zA-Z][\w-]*)\s+(?:[\d.]|\$\{)/);
      if (!name) continue;
      const animationName = name[1];
      if (ANIMATION_KEYWORDS.has(animationName)) continue;
      if (keyframes.has(animationName)) continue;
      missingKeyframes.push(`${file}:${index + 1} — animation „${animationName}” nie ma @keyframes w ${CSS_FILE}`);
    }
  });
}

if (unusedClasses.length === 0 && unusedKeyframes.length === 0 && missingKeyframes.length === 0) {
  console.log(`${CSS_FILE}: no dead classes or keyframes, every inline animation is defined.`);
  process.exit(0);
}

if (unusedClasses.length > 0) console.error('Unused classes:\n  ' + unusedClasses.join('\n  '));
if (unusedKeyframes.length > 0) console.error('Unused keyframes:\n  ' + unusedKeyframes.join('\n  '));
if (missingKeyframes.length > 0) console.error('Missing keyframes:\n  ' + missingKeyframes.join('\n  '));
process.exit(1);
