const { onValueCreated } = require('firebase-functions/v2/database');
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

// Usuwaj tokeny TYLKO gdy FCM wyraźnie mówi że są trwale nieważne.
// Błędy tymczasowe (sieć, quota, serwer) NIE powinny usuwać tokenu —
// inaczej po pierwszym problemie sieciowym tracimy token i już nigdy
// nie dostajemy powiadomień.
const PERMANENT_INVALID_CODES = new Set([
  'messaging/registration-token-not-registered',  // odinstalowana apka / wylogowany
  'messaging/invalid-registration-token',          // token nigdy nie był ważny
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

      // Zbierz TYLKO trwale nieważne tokeny (nie tymczasowe błędy sieciowe)
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
      // Nie usuwaj tokenów przy błędzie sieciowym/serwerowym
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
// Słuchamy na /notifications/pending/{notifId} zamiast /appData.
// Powód: onValueUpdated na /appData jest zawodny przy szybkich zmianach —
// Firebase może scalić wiele zapisów w jedno zdarzenie i trigger pomija
// nowe sesje dodane po usunięciu. onValueCreated odpala ZAWSZE, dokładnie
// raz na każdy nowy węzeł, bez względu na poprzednie operacje.
exports.onSessionAdded = onValueCreated(
  { ref: '/notifications/pending/{notifId}', region: 'europe-west1' },
  async (event) => {
    const notifId  = event.params.notifId;
    const pending  = event.data.val() || {};

    // Usuń trigger natychmiast — gdyby funkcja uruchomiła się ponownie
    // (np. retry po błędzie sieci), nie wyśle duplikatów.
    await getDatabase().ref(`/notifications/pending/${notifId}`).remove();

    // Odczytaj aktualny stan appData — potrzebujemy tygodni do liczenia serii
    const appSnap  = await getDatabase().ref('/appData').get();
    const appData  = appSnap.val() || {};
    const weeksAll = toArray(appData.weeks);

    // Znajdź sesję na podstawie ID przesłanego przez frontend
    const newSession = weeksAll.find(w => w.id === notifId);
    if (!newSession) {
      console.log(`Sesja ${notifId} nie istnieje w bazie — pominięto (usunięta przed obsługą?)`);
      return;
    }

    const present   = toArray(newSession.present);
    const multi     = toArray(newSession.multiPlayers);
    const date      = newSession.date || '';
    const cost      = newSession.cost || 0;
    const paying    = present.filter(p => !multi.includes(p));
    const perPerson = paying.length > 0 ? Math.round(cost / paying.length) : 0;

    console.log(`Nowa sesja: ${date}, ${present.length} graczy, ${perPerson} zł/os. (trigger: ${notifId})`);

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
      const streak = computeStreak(weeksAll, playerName);
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
            // Klik → zakładka RANKING + modal gracza
            url:        `/?tab=attendance&player=${encodeURIComponent(playerName)}`,
            tag:        `streak-${playerName}`,
          }
        );
      }
    }
  }
);
