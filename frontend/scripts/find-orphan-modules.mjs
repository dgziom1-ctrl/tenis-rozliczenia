/**
 * Fails when a module under `src/` is never imported and is not an entry point.
 * TypeScript's `noUnusedLocals` only sees inside a file, so a whole module can
 * rot in the tree without anything flagging it.
 */
import fs from 'node:fs';
import path from 'node:path';

const ENTRY_POINTS = [
  'src/main.tsx',
  'src/index.css',
  'src/vite-env.d.ts',
  'src/setupTests.js',
];

const modules = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      modules.push(p);
    }
  }
})('src');

const sources = new Map(modules.map((f) => [f, fs.readFileSync(f, 'utf8')]));

const isEntry = (file) =>
  ENTRY_POINTS.includes(file) || file.includes('__tests__/') || /\.test\.\w+$/.test(file);

const orphans = modules.filter((file) => {
  if (isEntry(file)) return false;
  const stem = file.replace(/\.(tsx|ts|jsx|js)$/, '');
  const bare = stem.replace(/^src\//, '');
  const dirIndex = bare.replace(/\/index$/, '');
  const candidates = new Set([bare, dirIndex, path.basename(stem)]);
  for (const [other, code] of sources) {
    if (other === file) continue;
    for (const c of candidates) {
      // Matches both the `@/…` alias and relative specifiers ending in the path.
      if (code.includes(`/${c}'`) || code.includes(`/${c}"`) ||
          code.includes(`'${c}'`) || code.includes(`"${c}"`)) {
        return false;
      }
    }
  }
  return true;
});

if (orphans.length === 0) {
  console.log('src/: every module is reachable from an entry point.');
  process.exit(0);
}

console.error('Modules that nothing imports:\n  ' + orphans.join('\n  '));
process.exit(1);
