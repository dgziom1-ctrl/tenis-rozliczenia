const { onValueUpdated }  = require('firebase-functions/v2/database');
const { initializeApp }   = require('firebase-admin/app');
const { getMessaging }    = require('firebase-admin/messaging');
const { getDatabase }     = require('firebase-admin/database');
const { getSessionShares } = require('./sessionCost');

initializeApp();

// Trzymane osobno od `frontend/src/constants` — Cloud Functions to inny pakiet.
const SPORT_EMOJI = { pingpong: '🏓', squash: '🎾', badminton: '🏸', padel: '🥎' };
const SPORT_LABEL = { pingpong: 'Ping-pong', squash: 'Squash', badminton: 'Badminton', padel: 'Padel' };

/** Kwota bez zbędnych zer na końcu: 42 → „42", 42.5 → „42,50". */
function formatZl(amount) {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace('.', ',');
}

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
/** Token z wpisu bazy — wpisy bywają puste albo w starym formacie (goły string). */
function readToken(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry.token === 'string') return entry.token;
  return '';
}

async function getAllTokens() {
  const snap = await getDatabase().ref('fcmTokens').get();
  if (!snap.exists()) return [];
  // Ta sama przeglądarka potrafi zapisać się pod kilkoma kluczami (np. po
  // reinstalacji PWA). Bez odsiania duplikatów dostaje tyle powiadomień,
  // ile ma wpisów w bazie.
  return [...new Set(Object.values(snap.val() || {}).map(readToken).filter(Boolean))];
}

const PERMANENT_INVALID_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

async function removeDeadTokens(deadTokens) {
  if (!deadTokens.length) return;
  const snap = await getDatabase().ref('fcmTokens').get();
  if (!snap.exists()) return;
  const dead = new Set(deadTokens);
  const removes = [];
  for (const [key, val] of Object.entries(snap.val() || {})) {
    const token = readToken(val);
    if (token && dead.has(token)) {
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

// ─── Sanitize player names for notification payloads ──────────────────────────
function sanitizeName(name) {
  return String(name || '').replace(/[<>"'&]/g, '').slice(0, 100);
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

// ─── Trigger: nowa sesja ──────────────────────────────────────────────────────
// Trigger odpala się przy KAŻDYM zapisie do /appData (także przy wpłatach),
// więc limitujemy równoległość — inaczej seria zapisów potrafi rozjechać
// wywołania na wiele instancji i zdublować powiadomienia.
const TRIGGER_OPTS = { region: 'europe-west1', maxInstances: 3, memory: '256MiB', timeoutSeconds: 120 };

exports.onSessionAdded = onValueUpdated(
  { ref: '/appData', ...TRIGGER_OPTS },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};

    const beforeTrigger = before.lastAddedSession || {};
    const afterTrigger  = after.lastAddedSession  || {};

    console.log(`Trigger: lastAddedSession before=${beforeTrigger.id || 'brak'}, after=${afterTrigger.id || 'brak'}`);

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

    const present      = toArray(newSession.present);
    const multi        = toArray(newSession.multiPlayers);
    const date         = newSession.date || '';
    const racketCost      = newSession.racketCost || 0;
    const sport           = newSession.sport || 'pingpong';

    // Kwoty liczy ta sama implementacja co w aplikacji, żeby powiadomienie
    // nigdy nie pokazało innej stawki niż karta gracza.
    const shares = getSessionShares({
      ...newSession,
      present,
      multiPlayers: multi,
      ownRacketPlayers: toArray(newSession.ownRacketPlayers),
    });

    const multiCount = multi.filter(p => present.includes(p)).length;

    let costPart = multiCount > 0
      ? `${formatZl(shares.baseCourt)} zł/os. (${formatZl(shares.baseCourtMulti)} zł z kartą)`
      : `${formatZl(shares.baseCourt)} zł/os.`;
    if (racketCost > 0) costPart += ` · rakiety: ${formatZl(racketCost)} zł`;

    const notifBody = `${date} · ${present.length} graczy · ${costPart}`;
    console.log(`Nowa sesja (${SPORT_LABEL[sport] || SPORT_LABEL.pingpong}): ${date}, ${present.length} graczy, ${formatZl(shares.baseCourt)} zł/os. (z kartą: ${formatZl(shares.baseCourtMulti)} zł, rakiety: ${formatZl(racketCost)} zł)`);

    const sportEmoji = SPORT_EMOJI[sport] || SPORT_EMOJI.pingpong;

    const tokens = await getAllTokens();
    console.log(`Tokenów FCM w bazie: ${tokens.length}`);
    if (!tokens.length) return;

    await sendToAll(
      tokens,
      `${sportEmoji} Nowa sesja dodana!`,
      notifBody,
      { type: 'new_session', date, url: '/?tab=dashboard', tag: `session-${date}` }
    );

    const STREAK_MILESTONES = [5, 10, 20, 30, 50, 100];
    for (const playerName of present) {
      const streak = computeStreak(weeksAfter, playerName);
      console.log(`  ${playerName}: seria ${streak}`);
      if (STREAK_MILESTONES.includes(streak)) {
        const emoji = streak >= 50 ? '🏆' : streak >= 20 ? '🔥' : '⚡';
        await sendToAll(
          tokens,
          `${emoji} Seria ${streak}!`,
          `${sanitizeName(playerName)} ma ${streak} sesji z rzędu!`,
          {
            type:       'streak',
            playerName: sanitizeName(playerName),
            streak:     String(streak),
            url:        `/?tab=attendance&player=${encodeURIComponent(sanitizeName(playerName))}`,
            tag:        `streak-${sanitizeName(playerName)}`,
          }
        );
      }
    }
  }
);

// ─── Trigger: nowy gracz ──────────────────────────────────────────────────────
// Porównuje players przed i po zapisie — jeśli pojawił się nowy, wysyła powiadomienie.
exports.onPlayerAdded = onValueUpdated(
  { ref: '/appData', ...TRIGGER_OPTS },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};

    const playersBefore = new Set(toArray(before.players));
    const playersAfter  = toArray(after.players);
    const newPlayers    = playersAfter.filter(p => !playersBefore.has(p));

    if (newPlayers.length === 0) return;

    console.log(`Nowi gracze: ${newPlayers.join(', ')}`);

    const tokens = await getAllTokens();
    if (!tokens.length) return;

    for (const playerName of newPlayers) {
      console.log(`  Wysyłam powiadomienie o nowym graczu: ${playerName}`);
      await sendToAll(
        tokens,
        '🎮 Nowy gracz!',
        `${sanitizeName(playerName)} dołączył do gry!`,
        {
          type:       'new_player',
          playerName: sanitizeName(playerName),
          url:        '/?tab=attendance',
          tag:        `new-player-${sanitizeName(playerName)}`,
        }
      );
    }
  }
);
