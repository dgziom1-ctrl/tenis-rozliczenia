const { onValueUpdated } = require('firebase-functions/v2/database');
const { initializeApp }  = require('firebase-admin/app');
const { getMessaging }   = require('firebase-admin/messaging');
const { getDatabase }    = require('firebase-admin/database');

initializeApp();

// ─── Normaliza tablice z Firebase RTDB ───────────────────────────────────────
// RTDB przechowuje tablice jako {0: val, 1: val} — Admin SDK konwertuje
// z powrotem do tablic JS, ale tylko gdy klucze są sekwencyjne od 0.
// Używamy toArray() wszędzie żeby być 100% pewni.
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.keys(val)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => val[k])
    .filter(v => v != null);
}

// ─── Tokeny FCM ───────────────────────────────────────────────────────────────
async function getAllTokens() {
  const snap = await getDatabase().ref('fcmTokens').get();
  if (!snap.exists()) return [];
  return Object.values(snap.val() || {}).map(t => t.token).filter(Boolean);
}

async function removeDeadTokens(deadTokens) {
  if (!deadTokens.length) return;
  const snap = await getDatabase().ref('fcmTokens').get();
  if (!snap.exists()) return;
  const removes = [];
  for (const [key, val] of Object.entries(snap.val() || {})) {
    if (deadTokens.includes(val.token)) {
      removes.push(getDatabase().ref(`fcmTokens/${key}`).remove());
    }
  }
  await Promise.all(removes);
  if (removes.length) console.log(`Usunięto ${removes.length} nieważnych tokenów`);
}

// ─── Wysyłka FCM ──────────────────────────────────────────────────────────────
async function sendToAll(tokens, title, body, data = {}) {
  if (!tokens.length) { console.log('Brak tokenów — pomijam'); return; }

  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const msg = {
      notification: { title, body },
      // Wszystkie wartości data muszą być stringami
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      webpush: {
        notification: {
          title, body,
          icon:     '/icon-192v2.png',
          badge:    '/icon-192v2.png',
          vibrate:  [100, 50, 100],
          requireInteraction: false,
        },
        fcm_options: { link: data.url || '/' },
        headers: { Urgency: 'high' },
      },
      android: {
        priority: 'high',
        notification: { sound: 'default', defaultVibrateTimings: true },
      },
      tokens: chunk,
    };

    try {
      const result = await getMessaging().sendEachForMulticast(msg);
      console.log(`FCM: ${result.successCount} OK, ${result.failureCount} błąd z ${chunk.length}`);
      const dead = result.responses
        .map((r, idx) => (!r.success ? chunk[idx] : null))
        .filter(Boolean);
      if (dead.length) await removeDeadTokens(dead);
    } catch (err) {
      console.error('FCM error:', err);
    }
  }
}

// ─── Seria gracza ─────────────────────────────────────────────────────────────
function computeStreak(weeks, playerName) {
  if (!weeks.length) return 0;
  const sorted = [...weeks].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '')
  );
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (toArray(sorted[i].present).includes(playerName)) streak++;
    else break;
  }
  return streak;
}

// ─── Trigger ──────────────────────────────────────────────────────────────────
exports.onSessionAdded = onValueUpdated(
  { ref: '/appData', region: 'europe-west1' },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};

    const weeksBefore = toArray(before.weeks);
    const weeksAfter  = toArray(after.weeks);

    // ── Wykrywanie nowej sesji przez ID, nie przez length ─────────────────
    // Porównanie przez length zawodzi gdy:
    //   - usunięto N sesji i dodano 1 (before.length == after.length)
    //   - Firebase batchuje zapis i funkcja widzi stan pośredni
    // Porównanie przez ID jest deterministyczne i zawsze poprawne.
    const idsBefore = new Set(weeksBefore.map(w => w.id).filter(Boolean));
    const newSessions = weeksAfter.filter(w => w.id && !idsBefore.has(w.id));

    console.log(`Tygodnie: przed=${weeksBefore.length}, po=${weeksAfter.length}, nowych=${newSessions.length}`);

    if (newSessions.length === 0) {
      console.log('Brak nowej sesji (edycja/usunięcie/płatność) — pomijam');
      return;
    }

    // Bierzemy ostatnio dodaną sesję (posortowane po dacie)
    const newSession = newSessions.sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    ).at(-1);

    const present    = toArray(newSession.present);
    const multi      = toArray(newSession.multiPlayers);
    const date       = newSession.date || '';
    const cost       = newSession.cost || 0;
    const paying     = present.filter(p => !multi.includes(p));
    const perPerson  = paying.length > 0 ? Math.round(cost / paying.length) : 0;

    console.log(`Nowa sesja: ${date}, ${present.length} graczy, ${perPerson} zł/os.`);

    const tokens = await getAllTokens();
    console.log(`Tokenów FCM: ${tokens.length}`);
    if (!tokens.length) return;

    // ── Powiadomienie o nowej sesji → klik otwiera Dashboard ─────────────
    await sendToAll(
      tokens,
      '🏓 Nowa sesja dodana!',
      `${date} · ${present.length} graczy · ${perPerson} zł/os.`,
      { type: 'new_session', date, url: '/?tab=dashboard' }
    );

    // ── Powiadomienia o seriach → klik otwiera kartę gracza w Rankingu ───
    const STREAK_MILESTONES = [5, 10, 20, 30, 50, 100];
    for (const playerName of present) {
      const streak = computeStreak(weeksAfter, playerName);
      console.log(`  ${playerName}: seria ${streak}`);
      if (STREAK_MILESTONES.includes(streak)) {
        const emoji = streak >= 50 ? '🏆' : streak >= 20 ? '🔥' : '⚡';
        await sendToAll(
          tokens,
          `${emoji} Seria ${streak}!`,
          `${playerName} ma ${streak} sesji z rzędu!`,
          {
            type:       'streak',
            playerName,
            streak:     String(streak),
            // Klik otwiera ranking z automatycznie otwartym modalem gracza
            url:        `/?tab=attendance&player=${encodeURIComponent(playerName)}`,
          }
        );
      }
    }
  }
);
