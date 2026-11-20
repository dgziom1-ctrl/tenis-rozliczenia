import type { StatsData } from './statsApi';

/**
 * Dane przykładowe do oglądania panelu w `npm run dev` (klucz `demo` w `#k=demo`).
 * Ten moduł ładuje się wyłącznie w trybie deweloperskim — nie trafia do buildu.
 */
export function buildDemoStats(now: number = Date.now()): StatsData {
  const day = 86_400_000;
  const pad = (n: number) => String(n).padStart(2, '0');
  const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  const daily = Array.from({ length: 30 }, (_, i) => {
    const ts = now - (29 - i) * day;
    const devices = (i * 7 + 3) % 6 + (i % 7 === 2 ? 3 : 0);
    return { day: dayKey(ts), devices, sessions: devices + (i % 3), events: devices * 14, errors: i === 12 ? 2 : 0 };
  });

  const heatmap = Array.from({ length: 7 }, (_, wd) =>
    Array.from({ length: 24 }, (_, h) => (wd === 2 && h >= 18 && h <= 21 ? 6 - Math.abs(h - 19) : (wd + h) % 11 === 0 ? 1 : 0)));

  const people: [string, string, string, boolean][] = [
    ['Ola', 'SM-G991B', 'chrome', true], ['Bartek', 'iphone', 'safari', true],
    ['Kuba', 'windows', 'edge', false], ['', 'android', 'chrome', false],
  ];

  return {
    generatedAt: now,
    truncated: false,
    range: { from: now - 30 * day, to: now },
    kpi: {
      events: 1840, devices: people.length, namedDevices: 3, activeToday: 2, active7d: 4, active30d: 4,
      newDevices7d: 1, sessions7d: 23, avgActiveSeconds: 214, errors7d: 2, pwaShare: 50, medianDataReadyMs: 1300,
    },
    daily,
    heatmap,
    devices: people.map(([name, model, browser, pwa], i) => ({
      did: `demo${i}abcdef${i}`, name, firstSeen: now - (20 - i) * day, lastSeen: now - i * 3_600_000 * 5,
      sessions: 14 - i * 3, events: 400 - i * 70, activeSeconds: 5400 - i * 900, os: model, browser, model: model.startsWith('SM') ? model : '',
      pwa, screen: i === 2 ? '1920x1080' : '412x915', lang: 'pl-PL', build: i === 3 ? 'm1abc' : 'm2def', lastTab: ['dashboard', 'attendance', 'history', 'admin'][i], errors: i === 3 ? 2 : 0,
    })),
    tabs: [{ key: 'dashboard', count: 210 }, { key: 'attendance', count: 140 }, { key: 'history', count: 66 }, { key: 'admin', count: 31 }, { key: 'players', count: 12 }],
    actions: [
      { key: 'payment_added', count: 18 }, { key: 'session_added', count: 9 }, { key: 'blik_copy', count: 7 },
      { key: 'theme_change', count: 5 }, { key: 'csv_export', count: 2 }, { key: 'payment_added (nieudane)', count: 1 },
    ],
    errors: [{ type: 'js_error', msg: 'Cannot read properties of undefined', count: 2, devices: 1, last: now - 2 * day }],
    push: { permission: { granted: 3, denied: 1 }, registered: 3, errors: 1, opened: 6 },
    versions: [{ key: 'm2def', count: 3 }, { key: 'm1abc', count: 1 }],
    recent: Array.from({ length: 12 }, (_, i) => ({
      ts: now - i * 420_000, type: ['page_view', 'payment_added', 'heartbeat', 'modal_open'][i % 4],
      did: `demo${i % 4}abcdef${i % 4}`, name: people[i % 4][0], props: (i % 4 === 0 ? { tab: 'dashboard' } : {}) as Record<string, string>,
    })),
  };
}
