import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite';
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

/**
 * Bez tych zmiennych `initializeApp`/`getDatabase` rzuca wyjątek jeszcze przed
 * zamontowaniem Reacta — zamiast komunikatu użytkownik widzi biały ekran.
 *
 * W CI brak sekretów musi zatrzymać wdrożenie. Lokalnie build ma przechodzić bez
 * konfiguracji: wymuszanie sekretów na komputerze dewelopera blokuje zwykłe
 * `npm run build`, a niczego nie chroni — wdrożenie i tak idzie z sekretów CI.
 */
const REQUIRED_BUILD_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_BLIK_NUMBER',
];

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const missing = REQUIRED_BUILD_ENV.filter(key => !env[key]?.trim());
    const optionalMissing = ['VITE_ADMIN_PASSWORD', 'VITE_FIREBASE_VAPID_KEY']
      .filter(key => !env[key]?.trim());

    if (missing.length > 0) {
      const detail = `Brak konfiguracji: ${missing.join(', ')}.`;
      if (process.env.CI) {
        throw new Error(
          `${detail} W CI zatrzymujemy build, żeby nie wdrożyć aplikacji bez bazy. `
          + 'Uzupełnij sekrety repozytorium.',
        );
      }
      console.warn(
        `[build] ${detail} Paczka powstanie, ale bez tych wartości aplikacja nie połączy się z Firebase. `
        + 'Wdrożenie i tak korzysta z sekretów CI.',
      );
    }

    if (optionalMissing.length > 0) {
      console.warn(
        `[build] Brak opcjonalnych zmiennych: ${optionalMissing.join(', ')}. `
        + 'Panel admina lub powiadomienia push będą niedostępne.',
      );
    }
  }

  return {
    plugins: [react(), prepareServiceWorker()],
    define: {
      // Aplikacja musi znać własne wydanie, żeby porównać je z `version.json`.
      __CP_APP_BUILD__: JSON.stringify(BUILD_ID),
    },
    server: {
      // `localhost` wystarcza do pracy na własnym komputerze. W środowiskach
      // podglądu (Arena/E2B) strona jest serwowana z domeny `*.e2b.app` — bez
      // wpisu na liście Vite odrzuca żądanie z komunikatem o niedozwolonym
      // hoście i podgląd pokazuje biały ekran.
      allowedHosts: ['localhost', '127.0.0.1', '.e2b.app'],
    },
    build: {
      rollupOptions: {
        output: {
          // Firebase (~400 kB) zmienia się raz na kilka miesięcy, a kod aplikacji
          // przy każdym wydaniu. Osobne paczki pozwalają przeglądarce zachować
          // dużą zależność w cache, zamiast pobierać ją od nowa z każdym buildem.
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-firebase': ['firebase/app', 'firebase/database', 'firebase/messaging'],
          },
        },
      },
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
  };
});
