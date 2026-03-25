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
  if (!playerName || !weekDate) {
    return { success: false, error: 'Brak danych RSVP' };
  }
  try {
    // 'reset' lub null = usuń głos
    if (!answer || answer === 'reset' || !['yes', 'no'].includes(answer)) {
      const { remove } = await import('firebase/database');
      await remove(ref(database, `rsvp/${weekDate}/${playerName}`));
    } else {
      await set(ref(database, `rsvp/${weekDate}/${playerName}`), answer);
    }
    return { success: true };
  } catch (err) {
    console.error('RSVP save error:', err);
    return { success: false, error: err?.message || 'Nie udało się zapisać RSVP' };
  }
}

// Subskrypcja odpowiedzi na dany tydzień
// Zwraca { Kamil: 'yes', Rafał: 'no', ... }
export function subscribeToRsvp(weekDate, callback) {
  const r = ref(database, `rsvp/${weekDate}`);
  onValue(r, snap => callback(snap.val() || {}));
  return () => off(r);
}
