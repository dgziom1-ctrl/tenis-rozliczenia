import { ref, set, onValue, off } from 'firebase/database';
import { database } from './config';

// Następna środa od dziś (lub dziś jeśli środa)
export function nextWednesdayISO() {
  const d = new Date();
  const day = d.getDay(); // 0=niedz, 3=środa
  const diff = (3 - day + 7) % 7 || 7; // dni do następnej środy
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// Zapisz odpowiedź gracza
export async function saveRsvp(playerName, weekDate, answer) {
  if (!playerName || !weekDate || !['yes', 'no'].includes(answer)) return;
  try {
    await set(ref(database, `rsvp/${weekDate}/${playerName}`), answer);
  } catch (err) {
    console.error('RSVP save error:', err);
  }
}

// Subskrypcja odpowiedzi na dany tydzień
// Zwraca { Kamil: 'yes', Rafał: 'no', ... }
export function subscribeToRsvp(weekDate, callback) {
  const r = ref(database, `rsvp/${weekDate}`);
  onValue(r, snap => callback(snap.val() || {}));
  return () => off(r);
}
