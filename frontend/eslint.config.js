import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    rules: {
      // Bez tej reguły `no-unused-vars` nie widzi komponentów użytych w JSX
      // i zgłasza je jako martwy kod (w plikach .tsx robi to za nas parser TS).
      'react/jsx-uses-vars': 'error',
      // Tylko prefiks `_` oznacza „celowo nieużywane”. Wcześniejszy wzorzec
      // `^[A-Z_]` przepuszczał też każdą nazwę z wielkiej litery, przez co
      // martwy kod przechodził lint bez słowa.
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'react-hooks/set-state-in-effect': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        // Lintowanie z typami — bez tego `no-floating-promises`
        // i `no-misused-promises` w ogóle nie działają.
        projectService: {
          // `vite.config.ts` celowo nie należy do `tsconfig.json` (to nie jest
          // kod apki), ale nadal chcemy go lintować.
          allowDefaultProject: ['vite.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Zapis do bazy, którego nikt nie doczekał, po cichu gubi błąd
      // i zostawia interfejs w stanie sprzed nieudanej zmiany.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Testy i pliki konfiguracyjne są poza `tsconfig.json`, więc reguły
    // wymagające typów nie mają dla nich informacji.
    files: ['**/*.{js,jsx}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['src/__tests__/**', '**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
  },
  {
    // Narzędzia deweloperskie uruchamiane przez Node, nie przez przeglądarkę.
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        importScripts: 'readonly',
        firebase: 'readonly',
        clients: 'readonly',
        self: 'readonly',
      },
    },
  },
])
