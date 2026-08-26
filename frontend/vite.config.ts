import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BUILD_ID_PLACEHOLDER = '__CP_BUILD_ID__';
const RELEASE_ASSETS_PLACEHOLDER = '__CP_RELEASE_ASSETS__';

/**
 * Uzupełnia Service Workera danymi, które znane są dopiero po zbudowaniu:
 * identyfikatorem wydania i listą jego paczek.
 *
 * Identyfikator nazywa cache workera, a `activate` usuwa wszystkie pozostałe.
 * Bez stempla nazwa byłaby stała, więc po wdrożeniu w cache zostałby
 * `index.html` z jednego wydania i paczki z drugiego — dokładnie ta niespójność,
 * po której pomaga tylko czyszczenie danych strony. Wyliczamy go z nazw plików,
 * a nie ze znacznika czasu: wdrożenie tego samego kodu nie unieważnia wtedy
 * cache'u bez powodu.
 *
 * Lista paczek pozwala workerowi zapisać całe wydanie już przy instalacji.
 * Sam `index.html` wymienia tylko paczki potrzebne od razu, więc offline
 * pierwsze wejście w osobno doładowywaną zakładkę kończyłoby się błędem.
 */
function prepareServiceWorker(): Plugin {
  const SW_FILE = 'firebase-messaging-sw.js';
  let resolved: ResolvedConfig;

  return {
    name: 'cp-prepare-service-worker',
    apply: 'build',

    configResolved(config) {
      resolved = config;
    },

    // `closeBundle` jest pierwszym momentem, w którym Vite ma już skopiowane
    // `public/` do katalogu wynikowego.
    closeBundle() {
      const outDir = path.resolve(resolved.root, resolved.build.outDir);
      const swPath = path.join(outDir, SW_FILE);
      const assetsDir = path.join(outDir, resolved.build.assetsDir);

      if (!fs.existsSync(swPath)) this.error(`Nie znalazłem ${SW_FILE} w ${outDir}.`);
      if (!fs.existsSync(assetsDir)) this.error(`Nie znalazłem katalogu paczek ${assetsDir}.`);

      const source = fs.readFileSync(swPath, 'utf8');
      for (const placeholder of [BUILD_ID_PLACEHOLDER, RELEASE_ASSETS_PLACEHOLDER]) {
        if (!source.includes(placeholder)) {
          this.error(
            `${SW_FILE} nie zawiera ${placeholder}. Bez tego cache workera nie działa poprawnie.`,
          );
        }
      }

      const assets = fs.readdirSync(assetsDir).sort()
        .map((name) => `/${resolved.build.assetsDir}/${name}`);

      // Same nazwy paczek nie wystarczą: poprawka w `boot-guard.js` albo
      // `index.html` nie zmienia ich hashy, więc worker zostałby bajt w bajt taki
      // sam, przeglądarka nie zauważyłaby aktualizacji i zapas w cache nigdy by
      // się nie odświeżył. Dlatego do stempla wchodzi też treść plików powłoki.
      const shellFiles = ['index.html', 'boot-guard.js']
        .map((name) => path.join(outDir, name))
        .filter((file) => fs.existsSync(file))
        .map((file) => fs.readFileSync(file));

      const buildId = createHash('sha256')
        .update(assets.join('|'))
        .update(Buffer.concat(shellFiles))
        .digest('hex')
        .slice(0, 12);

      const prepared = source
        .split(BUILD_ID_PLACEHOLDER).join(buildId)
        // Znacznik stoi w kodzie w cudzysłowach, więc podstawiamy elementy bez
        // nawiasów tablicy — dzięki temu plik jest poprawnym JS-em przed i po.
        .split(`'${RELEASE_ASSETS_PLACEHOLDER}'`).join(assets.map((p) => JSON.stringify(p)).join(', '));

      fs.writeFileSync(swPath, prepared);
    },
  };
}

export default defineConfig({
  plugins: [react(), prepareServiceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.js'],
    include: ['src/__tests__/**/*.test.{js,jsx,ts,tsx}'],
  },
});
