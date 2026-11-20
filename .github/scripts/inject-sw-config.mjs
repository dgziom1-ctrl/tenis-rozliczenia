// Wstawia konfigurację Firebase do Service Workera przed buildem.
//
// Worker nie przechodzi przez Vite, więc nie widzi `import.meta.env` — dostaje
// wartości przez podmianę znaczników PLACEHOLDER_* w `public/`.
//
// Zamiast `sed` z sekretami wklejonymi w treść polecenia:
// - sekrety przychodzą przez zmienne środowiskowe, nie przez interpolację
//   `${{ secrets.* }}` w skrypcie powłoki;
// - wartość jest wstawiana jako poprawny fragment literału JS — znaki `&`, `|`
//   czy cudzysłów w sekrecie nie psują pliku (w `sed` `&` oznacza dopasowanie);
// - brak wymaganej wartości zatrzymuje wdrożenie, zamiast po cichu wypuścić
//   workera, w którym push nie działa.
import fs from 'node:fs';

const FILE = process.argv[2] ?? 'frontend/public/firebase-messaging-sw.js';

/** Znacznik w pliku → zmienna środowiskowa z wartością (i czy jest wymagana). */
const FIELDS = [
  { placeholder: 'PLACEHOLDER_API_KEY', env: 'VITE_FIREBASE_API_KEY', required: true },
  { placeholder: 'PLACEHOLDER_AUTH_DOMAIN', env: 'VITE_FIREBASE_AUTH_DOMAIN', required: false },
  { placeholder: 'PLACEHOLDER_DATABASE_URL', env: 'VITE_FIREBASE_DATABASE_URL', required: false },
  { placeholder: 'PLACEHOLDER_PROJECT_ID', env: 'VITE_FIREBASE_PROJECT_ID', required: true },
  { placeholder: 'PLACEHOLDER_STORAGE_BUCKET', env: 'VITE_FIREBASE_STORAGE_BUCKET', required: false },
  { placeholder: 'PLACEHOLDER_MESSAGING_SENDER_ID', env: 'VITE_FIREBASE_MESSAGING_SENDER_ID', required: true },
  { placeholder: 'PLACEHOLDER_APP_ID', env: 'VITE_FIREBASE_APP_ID', required: true },
];

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!fs.existsSync(FILE)) fail(`Nie znalazłem pliku ${FILE}.`);

let source = fs.readFileSync(FILE, 'utf8');
const missing = [];

for (const { placeholder, env, required } of FIELDS) {
  if (!source.includes(placeholder)) {
    fail(`${FILE} nie zawiera ${placeholder} — znaczniki i ten skrypt rozjechały się.`);
  }
  const value = (process.env[env] ?? '').trim();
  if (required && !value) missing.push(env);
  // Znacznik stoi w cudzysłowach, więc wstawiamy zawartość literału bez nich.
  source = source.split(placeholder).join(JSON.stringify(value).slice(1, -1));
}

if (missing.length > 0) {
  fail(`Brak sekretów dla Service Workera: ${missing.join(', ')}. Uzupełnij sekrety repozytorium.`);
}
if (source.includes('PLACEHOLDER_')) {
  fail(`W ${FILE} zostały nieuzupełnione znaczniki PLACEHOLDER_*.`);
}

fs.writeFileSync(FILE, source);
console.log(`Konfiguracja Firebase wstawiona do ${FILE}.`);
