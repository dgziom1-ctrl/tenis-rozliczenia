/**
 * Fails when `src/index.css` declares a class or @keyframes that nothing references.
 * Selectors composed at runtime (e.g. `card-stagger-${n}`) never appear literally in
 * the source, so they must be listed in DYNAMIC_CLASSES to stay whitelisted.
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

if (unusedClasses.length === 0 && unusedKeyframes.length === 0) {
  console.log(`${CSS_FILE}: no dead classes or keyframes.`);
  process.exit(0);
}

if (unusedClasses.length > 0) console.error('Unused classes:\n  ' + unusedClasses.join('\n  '));
if (unusedKeyframes.length > 0) console.error('Unused keyframes:\n  ' + unusedKeyframes.join('\n  '));
process.exit(1);
