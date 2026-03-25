/**
 * Jednorazowy skrypt czyszczący testowych graczy z Firebase RTDB.
 *
 * Usuwa z appData.playerJoinWeek klucze: gfhfghf, vbcbcvbcv, Kacek, Kalms
 * (nie usuwa ich z appData.players — tam ich nie ma, więc nie ma co ruszać)
 *
 * Użycie:
 *   cd functions/
 *   node cleanup_test_players.js
 *
 * Wymaga: SERVICE_ACCOUNT w env LUB pliku serviceAccount.json obok skryptu.
 */

const admin = require('firebase-admin');

const DB_URL = 'https://tenis-rozliczenia-default-rtdb.europe-west1.firebasedatabase.app';

// Gracze do usunięcia z playerJoinWeek
const TEST_PLAYERS = ['gfhfghf', 'vbcbcvbcv', 'Kacek', 'Kalms'];

async function run() {
  // Inicjalizacja — próbuje env variable, potem plik lokalny
  if (process.env.SERVICE_ACCOUNT) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT)),
      databaseURL: DB_URL,
    });
  } else {
    try {
      const sa = require('./serviceAccount.json');
      admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: DB_URL });
    } catch {
      console.error('Brak SERVICE_ACCOUNT env ani pliku serviceAccount.json');
      process.exit(1);
    }
  }

  const db = admin.database();

  // Podgląd przed usunięciem
  const snap = await db.ref('appData/playerJoinWeek').get();
  if (!snap.exists()) {
    console.log('playerJoinWeek nie istnieje — nic do czyszczenia');
    process.exit(0);
  }

  const current = snap.val();
  console.log('Aktualne playerJoinWeek:', current);

  const toDelete = TEST_PLAYERS.filter(p => p in current);
  if (toDelete.length === 0) {
    console.log('Brak testowych graczy do usunięcia');
    process.exit(0);
  }

  console.log('Usuwam:', toDelete);

  const removes = toDelete.map(p =>
    db.ref(`appData/playerJoinWeek/${p}`).remove()
  );
  await Promise.all(removes);

  // Weryfikacja
  const after = await db.ref('appData/playerJoinWeek').get();
  console.log('playerJoinWeek po czyszczeniu:', after.val());
  console.log('Gotowe ✓');
  process.exit(0);
}

run().catch(err => {
  console.error('Błąd:', err.message);
  process.exit(1);
});
