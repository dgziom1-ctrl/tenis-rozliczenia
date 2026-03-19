const { onValueUpdated } = require('firebase-functions/v2/database');
const { initializeApp }  = require('firebase-admin/app');
const { getMessaging }   = require('firebase-admin/messaging');
const { getDatabase }    = require('firebase-admin/database');

initializeApp();

// ─── Helper: normalizuje dane z Firebase RTDB ─────────────────────────────
// Firebase RTDB przechowuje tablice jako obiekty z numerycznymi kluczami
// ({0: "Alice", 1: "Bob"}). Admin SDK zazwyczaj zwraca je z powrotem jako
// tablice JS jeśli klucze są sekwencyjne od 0 — ale nie zawsze, szczególnie
// gdy tablica jest pusta lub ma tylko jeden element. Bezpiecznie normalizujemy.
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // Obiekt z numerycznymi kluczami → tablica
  return Object.keys(val)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => val[k])
    .filter(v => v != null);
}

// ─── Helper: pobierz wszystkie tokeny FCM z bazy ─────────────────────────────
async function getAllTokens() {
  const db   = getDatabase();
  const snap = await db.ref('fcmTokens').get();
  if (!snap.exists()) return [];
  const obj = snap.val() || {};
  return Object.values(obj).map(t => t.token).filter(Boolean);
}

// ─── Helper: usuń martwe tokeny (np. odinstalowana apka) ─────────────────────
async function removeDeadTokens(deadTokens) {
  if (!deadTokens.length) return;
  const db   = getDatabase();
  const snap = await db.ref('fcmTokens').get();
  if (!snap.exists()) return;
  const obj = snap.val() || {};
  const removes = [];
  for (const [key, val] of Object.entries(obj)) {
    if (deadTokens.includes(val.token)) {
      removes.push(db.ref(`fcmTokens/${key}`).remove());
    }
  }
  await Promise.all(removes);
  if (removes.length) {
    console.log(`Usunięto ${removes.length} nieważnych tokenów`);
  }
}

// ─── Helper: wyślij do wszystkich tokenów ────────────────────────────────────
async function sendToAll(tokens, title, body, data = {}) {
  if (!tokens.length) {
    console.log('Brak tokenów — pomijam wysyłkę');
    return;
  }

  // FCM batch max 500
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      // Web push (Chrome, Firefox, Edge, Android Chrome, iOS PWA 16.4+)
      webpush: {
        notification: {
          title,
          body,
          icon:     '/icon-192v2.png',
          badge:    '/icon-192v2.png',
          vibrate:  [100, 50, 100],
          requireInteraction: false,
        },
        fcm_options: { link: '/' },
        headers: {
          // Pilność: high = dostarcz natychmiast, nie czekaj na ładowanie baterii
          Urgency: 'high',
        },
      },
      // Android — wyższy priorytet dostarczenia
      android: {
        priority: 'high',
        notification: {
          sound:               'default',
          defaultVibrateTimings: true,
        },
      },
      tokens: chunk,
    };

    try {
      const result = await getMessaging().sendEachForMulticast(message);
      console.log(`FCM: ${result.successCount} sukces, ${result.failureCount} błąd z ${chunk.length}`);

      // Zbierz martwe tokeny do usunięcia
      const dead = result.responses
        .map((resp, idx) => (!resp.success ? chunk[idx] : null))
        .filter(Boolean);

      if (dead.length) {
        console.log('Martwe tokeny do usunięcia:', dead.length);
        await removeDeadTokens(dead);
      }
    } catch (err) {
      console.error('FCM sendEachForMulticast error:', err);
    }
  }
}

// ─── Helper: oblicz bieżącą serię gracza ─────────────────────────────────────
function computeStreak(weeks, playerName) {
  if (!weeks.length) return 0;
  const sorted = [...weeks].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '')
  );
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const present = toArray(sorted[i].present);
    if (present.includes(playerName)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Trigger: zmiana w appData ────────────────────────────────────────────────
exports.onSessionAdded = onValueUpdated(
  { ref: '/appData', region: 'europe-west1' },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};

    // Normalizuj tablice — Firebase może zwrócić obiekt zamiast tablicy
    const weeksBefore = toArray(before.weeks);
    const weeksAfter  = toArray(after.weeks);

    console.log(`Tygodnie: przed=${weeksBefore.length}, po=${weeksAfter.length}`);

    // Nowa sesja = liczba tygodni wzrosła
    if (weeksAfter.length <= weeksBefore.length) {
      console.log('Brak nowej sesji — pomijam');
      return;
    }

    // Najnowsza sesja (ostatni element po posortowaniu)
    const sorted     = [...weeksAfter].sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    );
    const newSession = sorted[sorted.length - 1];
    if (!newSession) {
      console.log('Brak danych sesji — pomijam');
      return;
    }

    const present   = toArray(newSession.present);
    const multi     = toArray(newSession.multiPlayers);
    const date      = newSession.date  || '';
    const cost      = newSession.cost  || 0;
    const paying    = present.filter(p => !multi.includes(p));
    const perPerson = paying.length > 0 ? Math.round(cost / paying.length) : 0;

    console.log(`Nowa sesja: ${date}, ${present.length} graczy, ${perPerson} zł/os.`);

    const tokens = await getAllTokens();
    console.log(`Tokenów FCM: ${tokens.length}`);

    if (!tokens.length) return;

    // Powiadomienie o nowej sesji
    await sendToAll(
      tokens,
      '🏓 Nowa sesja dodana!',
      `${date} · ${present.length} graczy · ${perPerson} zł/os.`,
      { type: 'new_session', date }
    );

    // Powiadomienia o seriach
    const STREAK_MILESTONES = [5, 10, 15, 20, 25, 30];
    for (const playerName of present) {
      const streak = computeStreak(weeksAfter, playerName);
      if (STREAK_MILESTONES.includes(streak)) {
        console.log(`Seria ${streak} dla ${playerName}!`);
        await sendToAll(
          tokens,
          `🔥 Seria ${streak}!`,
          `${playerName} ma ${streak} sesji z rzędu!`,
          { type: 'streak', playerName, streak: String(streak) }
        );
      }
    }
  }
);
