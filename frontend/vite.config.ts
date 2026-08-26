import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const BUILD_ID_PLACEHOLDER = '__CP_BUILD_ID__';
const RELEASE_ASSETS_PLACEHOLDER = '__CP_RELEASE_ASSETS__';

/**
 * Identyfikator wydania, wspólny dla aplikacji, Service Workera i `version.json`.
 *
 * Liczony ze znacznika czasu, a nie z zawartości plików. Zawartość byłaby
 * ładniejsza (wdrożenie tego samego kodu nie unieważniałoby cache), ale musi być
 * znana już przy wczytaniu konfiguracji, żeby dało się ją wstrzyknąć do bundla —
 * a przy okazji gwarantuje, że każde wdrożenie jest rozpoznawalne jako nowe.
 * Zbędne unieważnienie cache jest tanie. Urządzenie, które nie zauważyło
 * aktualizacji, nie jest.
 */
const BUILD_ID = Date.now().toString(36);

/**
 * Uzupełnia Service Workera danymi znanymi dopiero po zbudowaniu i wystawia
 * `version.json`, po którym aplikacja rozpoznaje, że działa na starym wydaniu.
 *
 * Identyfikator nazywa cache workera, a `activate` usuwa wszystkie pozostałe.
 * Bez stempla nazwa byłaby stała, więc po wdrożeniu w cache zostałby
 * `index.html` z jednego wydania i paczki z drugiego — niespójność, po której
 * pomaga tylko czyszczenie danych strony.
 *
 * Lista paczek pozwala workerowi zapisać całe wydanie do pracy offline. Sam
 * `index.html` wymienia tylko paczki potrzebne od razu, więc offline pierwsze
 * wejście w osobno doładowywaną zakładkę kończyłoby się błędem.
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

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ buildId: BUILD_ID }, null, 2)}\n`,
      });
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

      const prepared = source
        .split(BUILD_ID_PLACEHOLDER).join(BUILD_ID)
        // Znacznik stoi w kodzie w cudzysłowach, więc podstawiamy elementy bez
        // nawiasów tablicy — dzięki temu plik jest poprawnym JS-em przed i po.
        .split(`'${RELEASE_ASSETS_PLACEHOLDER}'`).join(assets.map((p) => JSON.stringify(p)).join(', '));

      fs.writeFileSync(swPath, prepared);
    },
  };
}

export default defineConfig({
  plugins: [react(), prepareServiceWorker()],
  define: {
    // Aplikacja musi znać własne wydanie, żeby porównać je z `version.json`.
    __CP_APP_BUILD__: JSON.stringify(BUILD_ID),
  },
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
