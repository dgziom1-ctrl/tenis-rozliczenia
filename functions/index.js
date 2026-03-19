const { onValueUpdated } = require('firebase-functions/v2/database');
const { initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getDatabase } = require('firebase-admin/database');

initializeApp();

// ─── Helper: get all FCM tokens from DB ──────────────────────────
async function getAllTokens() {
  const db = getDatabase();
  const snap = await db.ref('fcmTokens').get();
  if (!snap.exists()) return [];
  const tokensObj = snap.val();
  // tokensObj: { tokenHash: { token, playerName, updatedAt } }
  return Object.values(tokensObj).map(t => t.token).filter(Boolean);
}

// ─── Helper: send to all tokens ──────────────────────────────────
async function sendToAll(tokens, title, body, data = {}) {
  if (!tokens.length) return;

  // FCM batch max 500
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const message = {
      notification: { title, body },
      data,
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192v2.png',
          badge: '/icon-192v2.png',
          vibrate: [100, 50, 100],
        },
        fcm_options: { link: '/' },
      },
      tokens: chunk,
    };
    try {
      const result = await getMessaging().sendEachForMulticast(message);
      // Clean up invalid tokens
      const db = getDatabase();
      const snap = await db.ref('fcmTokens').get();
      const tokensObj = snap.val() || {};
      result.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const deadToken = chunk[idx];
          // Remove invalid token
          Object.entries(tokensObj).forEach(([key, val]) => {
            if (val.token === deadToken) {
              db.ref(`fcmTokens/${key}`).remove();
            }
          });
        }
      });
    } catch (err) {
      console.error('FCM send error:', err);
    }
  }
}

// ─── Helper: compute current streak for a player ─────────────────
function computeStreak(weeks, playerName) {
  if (!weeks || !Array.isArray(weeks)) return 0;
  const sorted = [...weeks].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if ((sorted[i].present || []).includes(playerName)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Trigger: new session added ───────────────────────────────────
exports.onSessionAdded = onValueUpdated(
  { ref: '/appData', region: 'europe-west1' },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};

    const weeksBefore = before.weeks || [];
    const weeksAfter  = after.weeks  || [];

    // New session = weeks count increased
    if (weeksAfter.length <= weeksBefore.length) return;

    const newSession = weeksAfter[weeksAfter.length - 1];
    if (!newSession) return;

    const present = newSession.present || [];
    const date = newSession.date || '';
    const cost = newSession.cost || 0;
    const perPerson = present.length > 0 ? Math.round(cost / present.length) : 0;

    const tokens = await getAllTokens();
    if (!tokens.length) return;

    await sendToAll(
      tokens,
      '🏓 Nowa sesja dodana!',
      `${date} · ${present.length} graczy · ${perPerson} zł/os.`,
      { type: 'new_session', date }
    );

    // Check streaks for all present players
    const STREAK_MILESTONES = [5, 10, 15, 20, 25, 30];
    for (const playerName of present) {
      const streak = computeStreak(weeksAfter, playerName);
      if (STREAK_MILESTONES.includes(streak)) {
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
