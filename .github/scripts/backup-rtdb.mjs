// Backup Realtime Database przez REST API.
// Bez zależności z npm — firebase-admin potrafi się wysypać na własnych
// tranzytywnych paczkach (@firebase/app), a backup ma po prostu działać.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = [
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Węzły, których nie chcemy trzymać w archiwum (krótkożyciowe i wrażliwe).
const EXCLUDED_NODES = ['fcmTokens'];

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function readServiceAccount() {
  const raw = (process.env.SERVICE_ACCOUNT || '').trim();
  if (!raw) {
    fail('Brak sekretu z kontem serwisowym (SERVICE_ACCOUNT jest puste).');
  }

  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');

  let sa;
  try {
    sa = JSON.parse(json);
  } catch (err) {
    fail(`Konto serwisowe nie jest poprawnym JSON-em: ${err.message}`);
  }

  if (!sa.client_email || !sa.private_key) {
    fail('Konto serwisowe nie zawiera client_email / private_key.');
  }

  // Sekrety bywają zapisane z literalnym "\n" zamiast znaku nowej linii.
  sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPES.join(' '),
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(sa.private_key, 'base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await res.text();
  if (!res.ok) {
    fail(`Nie udało się pobrać tokenu OAuth (HTTP ${res.status}): ${body}`);
  }
  return JSON.parse(body).access_token;
}

async function fetchDatabase(dbUrl, token) {
  const url = `${dbUrl.replace(/\/$/, '')}/.json`;
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(300_000),
      });
      const body = await res.text();
      if (res.ok) return JSON.parse(body);
      lastError = `HTTP ${res.status}: ${body.slice(0, 500)}`;
      // 4xx nie naprawi się przez ponowienie.
      if (res.status < 500) break;
    } catch (err) {
      lastError = err.message;
    }
    console.log(`Próba ${attempt} nieudana (${lastError}), ponawiam...`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
  }

  fail(`Nie udało się pobrać bazy: ${lastError}`);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const outFile = process.env.OUTPUT_FILE;
  if (!dbUrl) fail('Brak DATABASE_URL.');
  if (!outFile) fail('Brak OUTPUT_FILE.');

  const sa = readServiceAccount();
  console.log(`--- Start backup RTDB (${sa.client_email}) ---`);

  const token = await getAccessToken(sa);
  const data = await fetchDatabase(dbUrl, token);

  if (data === null || typeof data !== 'object') {
    fail('Baza zwróciła pustą lub nieoczekiwaną odpowiedź — przerywam, żeby nie zapisać pustego backupu.');
  }

  for (const node of EXCLUDED_NODES) {
    if (node in data) {
      delete data[node];
      console.log(`Usunięto węzeł: ${node}`);
    }
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));

  const bytes = fs.statSync(outFile).size;
  console.log(`Zapisano ${outFile}`);
  console.log(`Węzły: ${Object.keys(data).join(', ')}`);
  console.log(`Rozmiar: ${bytes} bajtów`);
}

main().catch((err) => fail(err.stack || err.message));
