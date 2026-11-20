// Czysta agregacja zdarzeń statystyk — bez zależności od Firebase, żeby dało się
// ją testować z poziomu frontendu (patrz `analyticsAggregate.test.js`).

const TZ = 'Europe/Warsaw';
const DAY_MS = 86_400_000;

// Zdarzenia „techniczne” nie są akcjami użytkownika — nie liczymy ich w rankingu akcji.
const SYSTEM_TYPES = new Set([
  'app_start', 'app_hidden', 'app_visible', 'session_end', 'heartbeat', 'perf',
  'page_view', 'data_ready', 'network', 'modal_open',
]);
const ERROR_TYPES = new Set(['js_error', 'js_rejection', 'react_error', 'connection_error', 'boot_timeout', 'push_error']);

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const partsFormat = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', hour12: false });
const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** „2026-11-12” w czasie polskim. */
function dayKey(ts) {
  return dayFormat.format(new Date(ts));
}

/** [dzień tygodnia pn=0…nd=6, godzina 0–23] w czasie polskim. */
function weekdayHour(ts) {
  const parts = partsFormat.formatToParts(new Date(ts));
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  return [WEEKDAY_INDEX[weekday] ?? 0, hour];
}

function inc(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

function topN(map, limit) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

/**
 * @param {Array<{ts:number,type:string,did:string,sid:string,name?:string,props?:object}>} events
 * @param {number} now znacznik „teraz” (parametr, żeby test był deterministyczny)
 */
function aggregate(events, now = Date.now()) {
  const list = (Array.isArray(events) ? events : [])
    .filter((e) => e && typeof e.ts === 'number' && typeof e.did === 'string')
    .sort((a, b) => a.ts - b.ts);

  const today = dayKey(now);
  const since7 = now - 7 * DAY_MS;
  const since30 = now - 30 * DAY_MS;

  const devices = new Map();
  const sessions = new Map(); // sid -> { did, start, activeS }
  const daily = new Map();
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  const tabs = {};
  const actions = {};
  const versions = {};
  const errorGroups = new Map();
  const push = { permission: {}, registered: 0, errors: 0, opened: 0 };
  const dataReadyMs = [];

  const ensureDay = (day) => {
    if (!daily.has(day)) daily.set(day, { day, devices: new Set(), sessions: new Set(), events: 0, errors: 0 });
    return daily.get(day);
  };

  for (const e of list) {
    const p = e.props || {};
    const day = dayKey(e.ts);
    const d = ensureDay(day);
    d.devices.add(e.did);
    d.sessions.add(e.sid);
    d.events += 1;

    let dev = devices.get(e.did);
    if (!dev) {
      dev = {
        did: e.did, name: '', firstSeen: e.ts, lastSeen: e.ts, sessions: new Set(), events: 0,
        activeSeconds: 0, os: '', browser: '', model: '', pwa: false, screen: '', lang: '', build: '', lastTab: '',
        errors: 0,
      };
      devices.set(e.did, dev);
    }
    dev.lastSeen = e.ts;
    dev.events += 1;
    dev.sessions.add(e.sid);
    if (e.name) dev.name = e.name;

    let ses = sessions.get(e.sid);
    if (!ses) { ses = { did: e.did, start: e.ts, activeS: 0 }; sessions.set(e.sid, ses); }
    if (typeof p.active_s === 'number') ses.activeS = Math.max(ses.activeS, p.active_s);

    switch (e.type) {
      case 'app_start': {
        const [wd, hr] = weekdayHour(e.ts);
        heat[wd][hr] += 1;
        dev.os = String(p.os || dev.os);
        dev.browser = String(p.browser || dev.browser);
        dev.model = String(p.model || dev.model);
        dev.pwa = Boolean(p.pwa);
        dev.screen = String(p.screen || dev.screen);
        dev.lang = String(p.lang || dev.lang);
        dev.build = String(p.build || dev.build);
        break;
      }
      case 'page_view':
        inc(tabs, String(p.tab || 'other'));
        dev.lastTab = String(p.tab || dev.lastTab);
        break;
      case 'data_ready':
        if (typeof p.ms === 'number') dataReadyMs.push(p.ms);
        break;
      case 'push_permission':
        inc(push.permission, String(p.result || 'unknown'));
        break;
      case 'push_registered':
        push.registered += 1;
        break;
      case 'push_open':
        push.opened += 1;
        break;
      default:
        break;
    }

    if (ERROR_TYPES.has(e.type)) {
      d.errors += 1;
      dev.errors += 1;
      if (e.type === 'push_error') push.errors += 1;
      const msg = String(p.msg || p.code || p.err || e.type).slice(0, 100);
      const key = `${e.type}|${msg}`;
      const g = errorGroups.get(key) || { type: e.type, msg, count: 0, devices: new Set(), last: 0 };
      g.count += 1; g.devices.add(e.did); g.last = e.ts;
      errorGroups.set(key, g);
    } else if (!SYSTEM_TYPES.has(e.type)) {
      // Nieudane operacje (`ok: false`) liczymy osobno, żeby nie zawyżały popularności.
      inc(actions, p.ok === false ? `${e.type} (nieudane)` : e.type);
    }
  }

  // Czas aktywności urządzenia = suma sesji.
  for (const ses of sessions.values()) {
    const dev = devices.get(ses.did);
    if (dev) dev.activeSeconds += ses.activeS;
  }
  for (const dev of devices.values()) inc(versions, dev.build || 'nieznana');

  const activeSince = (since) => new Set(list.filter((e) => e.ts >= since).map((e) => e.did));
  const recentSessions = [...sessions.values()].filter((s) => s.start >= since7);
  const withActive = recentSessions.filter((s) => s.activeS > 0);
  const avgActive = withActive.length
    ? Math.round(withActive.reduce((sum, s) => sum + s.activeS, 0) / withActive.length)
    : 0;

  // Ostatnie 30 dni, także te bez ruchu — wykres nie ma dziur.
  const dailySeries = [];
  for (let i = 29; i >= 0; i -= 1) {
    const key = dayKey(now - i * DAY_MS);
    const d = daily.get(key);
    dailySeries.push({
      day: key,
      devices: d ? d.devices.size : 0,
      sessions: d ? d.sessions.size : 0,
      events: d ? d.events : 0,
      errors: d ? d.errors : 0,
    });
  }

  const sortedDataReady = [...dataReadyMs].sort((a, b) => a - b);

  return {
    generatedAt: now,
    range: { from: list[0]?.ts ?? null, to: list.at(-1)?.ts ?? null },
    kpi: {
      events: list.length,
      devices: devices.size,
      namedDevices: [...devices.values()].filter((d) => d.name).length,
      activeToday: new Set(list.filter((e) => dayKey(e.ts) === today).map((e) => e.did)).size,
      active7d: activeSince(since7).size,
      active30d: activeSince(since30).size,
      newDevices7d: [...devices.values()].filter((d) => d.firstSeen >= since7).length,
      sessions7d: recentSessions.length,
      avgActiveSeconds: avgActive,
      errors7d: list.filter((e) => e.ts >= since7 && ERROR_TYPES.has(e.type)).length,
      pwaShare: devices.size
        ? Math.round((100 * [...devices.values()].filter((d) => d.pwa).length) / devices.size)
        : 0,
      medianDataReadyMs: sortedDataReady.length ? sortedDataReady[Math.floor(sortedDataReady.length / 2)] : null,
    },
    daily: dailySeries,
    heatmap: heat,
    devices: [...devices.values()]
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .map((d) => ({ ...d, sessions: d.sessions.size })),
    tabs: topN(tabs, 10),
    actions: topN(actions, 25),
    errors: [...errorGroups.values()]
      .sort((a, b) => b.last - a.last)
      .slice(0, 25)
      .map((g) => ({ ...g, devices: g.devices.size })),
    push,
    versions: topN(versions, 10),
    recent: list.slice(-150).reverse().map((e) => ({
      ts: e.ts, type: e.type, did: e.did, name: e.name || '', props: e.props || {},
    })),
  };
}

module.exports = { aggregate, dayKey, ERROR_TYPES, SYSTEM_TYPES };
