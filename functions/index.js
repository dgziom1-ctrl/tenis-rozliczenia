const { onValueUpdated } = require('firebase-functions/v2/database');
const { initializeApp }  = require('firebase-admin/app');
const { getMessaging }   = require('firebase-admin/messaging');
const { getDatabase }    = require('firebase-admin/database');

initializeApp();

// ─── Normalizacja tablic z Firebase RTDB ─────────────────────────────────────
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

const PERMANENT_INVALID_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

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
  console.log(`Usunięto ${removes.length} trwale nieważnych tokenów`);
}

// ─── Wysyłka FCM ──────────────────────────────────────────────────────────────
async function sendToAll(tokens, title, body, data = {}) {
  if (!tokens.length) { console.log('Brak tokenów — pomijam'); return; }

  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const msg = {
      notification: { title, body },
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

      const permanentlyDead = result.responses
        .map((r, idx) => {
          if (r.success) return null;
          const code = r.error?.code || '';
          console.log(`  Token ${idx} błąd: ${code}`);
          return PERMANENT_INVALID_CODES.has(code) ? chunk[idx] : null;
        })
        .filter(Boolean);

      if (permanentlyDead.length) {
        console.log(`Trwale nieważne tokeny: ${permanentlyDead.length}`);
        await removeDeadTokens(permanentlyDead);
      }
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
// Detekcja nowej sesji przez lastAddedSession.id zamiast porównywania list tygodni.
//
// PROBLEM ze starym podejściem (porównywanie idsBefore vs idsAfter):
//   Firebase może scalić wiele operacji (delete + add) w jedno onValueUpdated
//   zdarzenie. Jeśli zdarzenie przyszło za późno lub zostało zbatchowane,
//   funkcja mogła nie zostać wywołana wcale dla ponownego dodania.
//
// NOWE podejście:
//   Frontend zapisuje lastAddedSession: { id, ts } WEWNĄTRZ tej samej transakcji
//   co nowa sesja — jeden atomowy zapis. Cloud Function sprawdza:
//     before.lastAddedSession.id !== after.lastAddedSession.id
//   Jeśli tak — nowa sesja na pewno została dodana, bez względu na to ile
//   operacji Firebase scalił w jedno zdarzenie. Pole ts gwarantuje zmianę
//   nawet w skrajnych przypadkach.
exports.onSessionAdded = onValueUpdated(
  { ref: '/appData', region: 'europe-west1' },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};

    const beforeTrigger = before.lastAddedSession || {};
    const afterTrigger  = after.lastAddedSession  || {};

    console.log(`Trigger: lastAddedSession before=${beforeTrigger.id || 'brak'}, after=${afterTrigger.id || 'brak'}`);

    // Brak zmiany lastAddedSession = edycja / usunięcie / płatność — pomijamy
    if (!afterTrigger.id || afterTrigger.id === beforeTrigger.id) {
      console.log('Brak nowej sesji (edycja/usunięcie/płatność) — pomijam');
      return;
    }

    const weeksAfter = toArray(after.weeks);
    const newSession = weeksAfter.find(w => w.id === afterTrigger.id);

    if (!newSession) {
      console.log(`Sesja ${afterTrigger.id} nie istnieje w after.weeks — pomijam`);
      return;
    }

    const present   = toArray(newSession.present);
    const multi     = toArray(newSession.multiPlayers);
    const date      = newSession.date || '';
    const cost      = newSession.cost || 0;
    const paying    = present.filter(p => !multi.includes(p));
    const perPerson = paying.length > 0 ? Math.round(cost / paying.length) : 0;

    console.log(`Nowa sesja: ${date}, ${present.length} graczy, ${perPerson} zł/os.`);

    const tokens = await getAllTokens();
    console.log(`Tokenów FCM w bazie: ${tokens.length}`);
    if (!tokens.length) {
      console.log('UWAGA: brak tokenów FCM — nikt nie włączył powiadomień?');
      return;
    }

    // ── Powiadomienie o nowej sesji → klik otwiera Dashboard ─────────────
    await sendToAll(
      tokens,
      '🏓 Nowa sesja dodana!',
      `${date} · ${present.length} graczy · ${perPerson} zł/os.`,
      { type: 'new_session', date, url: '/?tab=dashboard', tag: `session-${date}` }
    );

    // ── Powiadomienia o seriach → klik otwiera modal gracza w Rankingu ───
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
            url:        `/?tab=attendance&player=${encodeURIComponent(playerName)}`,
            tag:        `streak-${playerName}`,
          }
        );
      }
    }
  }
);
