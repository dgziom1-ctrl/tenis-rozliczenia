import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';
import { clearStaleTransportPreference } from './transport';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Przed `getDatabase`: bez tego jedno mignięcie sieci potrafi na stałe przełączyć
// bazę na gorszy transport i zostawić aplikację w trybie offline (patrz `transport.ts`).
clearStaleTransportPreference();

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const dataRef = ref(database, 'appData');
