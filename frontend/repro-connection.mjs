/**
 * Tymczasowy eksperyment: czy nadzór połączenia z `AppDataProvider` blokuje
 * pierwsze połączenie z bazą. Uruchamiany ręcznie, usuwany po diagnozie.
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, goOffline, goOnline } from 'firebase/database';

const DATABASE_URL = 'https://tenis-rozliczenia-default-rtdb.europe-west1.firebasedatabase.app';
const MODE = process.argv[2]; // 'control' | 'supervisor'

const app = initializeApp({ apiKey: 'x', projectId: 'tenis-rozliczenia', databaseURL: DATABASE_URL });
const db = getDatabase(app);

const started = Date.now();
const since = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

let gotData = false;
let connectedAt = null;

onValue(ref(db, '.info/connected'), (snap) => {
  const value = snap.val() === true;
  console.log(`[${since()}] .info/connected = ${value}`);
  if (value && connectedAt === null) connectedAt = Date.now();
});

onValue(ref(db, 'appData/players'), (snap) => {
  if (gotData) return;
  gotData = true;
  console.log(`[${since()}] DANE PRZYSZLY: ${JSON.stringify(snap.val())}`);
}, (error) => {
  console.log(`[${since()}] BLAD ODCZYTU: ${error.message}`);
});

if (MODE === 'supervisor') {
  // Dokładnie to, co robi nadzór: wymuszenie wznowienia od razu po starcie,
  // a potem co 8 sekund, dopóki połączenie nie zostanie zgłoszone jako żywe.
  const attempt = () => {
    if (connectedAt !== null) return;
    console.log(`[${since()}] forceReconnect(): goOffline + goOnline`);
    goOffline(db);
    goOnline(db);
  };
  attempt();
  setInterval(attempt, 8000);
}

setTimeout(() => {
  console.log(`\nWYNIK (${MODE}): dane=${gotData ? 'TAK' : 'NIE'} połączenie=${connectedAt ? 'TAK' : 'NIE'}`);
  process.exit(gotData ? 0 : 1);
}, 25000);
