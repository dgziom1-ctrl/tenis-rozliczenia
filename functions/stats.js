const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { getDatabase } = require('firebase-admin/database');
const { aggregate } = require('./analyticsAggregate');
const { keyMatches, bearerToken } = require('./statsKey');

// Klucz właściciela do podglądu statystyk. Siedzi w Secret Managerze, nigdy w repo
// ani w bundlu aplikacji: `firebase functions:secrets:set STATS_KEY`.
const STATS_KEY = defineSecret('STATS_KEY');

const REGION = 'europe-west1';
/** Ile dni wstecz czytamy i ile przechowujemy. */
const WINDOW_DAYS = 90;
const RETENTION_DAYS = 180;
/** Twardy limit odczytu — chroni funkcję przed rozrostem bazy. */
const MAX_EVENTS = 30_000;
const DAY_MS = 86_400_000;

// Hosting przekierowuje `/__stats` na tę funkcję (firebase.json), więc przeglądarka
// widzi ten sam adres co aplikacja — bez CORS i bez zmian w CSP.
exports.stats = onRequest(
  { region: REGION, secrets: [STATS_KEY], maxInstances: 2, memory: '512MiB', timeoutSeconds: 60 },
  async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');

    if (req.method !== 'POST') { res.status(404).send('Not found'); return; }

    if (!keyMatches(bearerToken(req.get('authorization')), STATS_KEY.value())) {
      // Opóźnienie zniechęca do zgadywania klucza, a odpowiedź niczego nie zdradza.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      res.status(404).send('Not found');
      return;
    }

    const now = Date.now();
    const snap = await getDatabase()
      .ref('analytics/events')
      .orderByChild('ts')
      .startAt(now - WINDOW_DAYS * DAY_MS)
      .limitToLast(MAX_EVENTS)
      .get();

    const events = snap.exists() ? Object.values(snap.val()) : [];
    res.status(200).json({ ...aggregate(events, now), truncated: events.length >= MAX_EVENTS });
  },
);

// Raz dziennie kasuje zdarzenia starsze niż okres przechowywania.
exports.pruneAnalytics = onSchedule(
  { region: REGION, schedule: 'every day 03:30', timeZone: 'Europe/Warsaw', maxInstances: 1, memory: '256MiB' },
  async () => {
    const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
    const ref = getDatabase().ref('analytics/events');
    let removed = 0;
    for (;;) {
      const snap = await ref.orderByChild('ts').endAt(cutoff).limitToFirst(2000).get();
      if (!snap.exists()) break;
      const updates = {};
      snap.forEach((child) => { updates[child.key] = null; });
      await ref.update(updates);
      removed += Object.keys(updates).length;
    }
    console.log(`Statystyki: usunięto ${removed} zdarzeń starszych niż ${RETENTION_DAYS} dni`);
  },
);
