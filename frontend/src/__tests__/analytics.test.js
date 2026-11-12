import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { cleanProps, buildEvent, track, flush, enableTracking, resetTracking, isTracking } from '../lib/analytics/track';
import { getDeviceId, setAnalyticsPlayer, getAnalyticsPlayer, setOptOut, isOptedOut, SESSION_ID } from '../lib/analytics/identity';
import { parseUserAgent } from '../lib/analytics/device';

const require = createRequire(import.meta.url);
const { aggregate } = require('../../../functions/analyticsAggregate.js');
const { keyMatches, bearerToken } = require('../../../functions/statsKey.js');

beforeEach(() => {
  resetTracking();
  setOptOut(false);
  localStorage.clear();
});

describe('zbieranie zdarzeń', () => {
  it('nic nie robi, dopóki zbieranie nie jest włączone (testy, demo, dev)', async () => {
    const sink = vi.fn().mockResolvedValue(undefined);
    expect(isTracking()).toBe(false);
    track('page_view', { tab: 'x' });
    enableTracking({ allowed: false, sinkOverride: sink });
    track('page_view');
    await flush();
    expect(sink).not.toHaveBeenCalled();
  });

  it('zbiera zdarzenia i wysyła je jednym wsadem z tożsamością urządzenia', async () => {
    const sink = vi.fn().mockResolvedValue(undefined);
    expect(enableTracking({ allowed: true, sinkOverride: sink })).toBe(true);

    track('page_view', { tab: 'attendance' });
    track('payment_added', { ok: true });
    track('heartbeat');
    await flush();

    expect(sink).toHaveBeenCalledTimes(1);
    const batch = sink.mock.calls[0][0];
    expect(batch.map((e) => e.type)).toEqual(['page_view', 'payment_added', 'heartbeat']);
    expect(batch[0]).toMatchObject({ did: getDeviceId(), sid: SESSION_ID, props: { tab: 'attendance' } });
    expect(typeof batch[0].ts).toBe('number');
  });

  it('dopina imię gracza, gdy urządzenie je podało', () => {
    expect(buildEvent('x').name).toBeUndefined();
    setAnalyticsPlayer('  Ola ');
    expect(getAnalyticsPlayer()).toBe('Ola');
    expect(buildEvent('x').name).toBe('Ola');
    setAnalyticsPlayer('unknown');
    expect(getAnalyticsPlayer()).toBe('Ola');
  });

  it('ID urządzenia jest stałe i anonimowe', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[a-z0-9]{10,64}$/);
    expect(getDeviceId()).toBe(id);
  });

  it('szanuje wyłączenie z ukrytego panelu', () => {
    setOptOut(true);
    expect(isOptedOut()).toBe(true);
    expect(enableTracking({ allowed: true, sinkOverride: vi.fn() })).toBe(false);
    track('page_view');
  });

  it('awaria zapisu nigdy nie wychodzi na zewnątrz', async () => {
    const sink = vi.fn().mockRejectedValue(new Error('PERMISSION_DENIED'));
    enableTracking({ allowed: true, sinkOverride: sink });
    track('page_view');
    await expect(flush()).resolves.toBeUndefined();
    // Błąd reguł = porzucamy zdarzenia, a nie ponawiamy w pętli.
    await flush();
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('bez sieci zostawia zdarzenia na później', async () => {
    const sink = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    enableTracking({ allowed: true, sinkOverride: sink });
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    track('page_view');
    await flush();
    online.mockReturnValue(true);
    await flush();
    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink.mock.calls[1][0]).toHaveLength(1);
    online.mockRestore();
  });

  it('przycina właściwości do limitów reguł bazy', () => {
    const props = cleanProps({
      long: 'x'.repeat(300), n: 3.14159, ok: false, empty: '', nil: null, undef: undefined,
      ['a'.repeat(50)]: 'k', 'zły klucz': 1,
    });
    expect(props.long).toHaveLength(100);
    expect(props.n).toBe(3.14);
    expect(props.ok).toBe(false);
    expect('empty' in props).toBe(false);
    expect('nil' in props).toBe(false);
    expect(Object.keys(props).every((k) => /^[a-zA-Z0-9_]{1,24}$/.test(k))).toBe(true);
    expect(cleanProps({ a: undefined })).toBeUndefined();
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(cleanProps(many))).toHaveLength(12);
  });
});

describe('rozpoznawanie urządzenia', () => {
  it('rozpoznaje system, przeglądarkę i model telefonu', () => {
    expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; SM-G991B Build/UP1A) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'))
      .toEqual({ os: 'android', browser: 'chrome', model: 'SM-G991B' });
    expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'))
      .toEqual({ os: 'ios', browser: 'safari' });
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36 Edg/126.0'))
      .toEqual({ os: 'windows', browser: 'edge' });
  });
});

describe('agregacja statystyk (functions/analyticsAggregate.js)', () => {
  const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
  const H = 3_600_000;
  const ev = (ts, type, did, sid, props, name) => ({ ts, type, did, sid, ...(name ? { name } : {}), ...(props ? { props } : {}) });

  const events = [
    ev(NOW - 2 * H, 'app_start', 'd1', 's1', { os: 'android', browser: 'chrome', pwa: true, build: 'b1' }, 'Ola'),
    ev(NOW - 2 * H + 1000, 'page_view', 'd1', 's1', { tab: 'dashboard' }, 'Ola'),
    ev(NOW - 2 * H + 2000, 'payment_added', 'd1', 's1', { ok: true }, 'Ola'),
    ev(NOW - 2 * H + 3000, 'payment_added', 'd1', 's1', { ok: false, err: 'x' }, 'Ola'),
    ev(NOW - 2 * H + 4000, 'session_end', 'd1', 's1', { active_s: 120 }, 'Ola'),
    ev(NOW - 40 * 86_400_000, 'app_start', 'd2', 's2', { os: 'ios', browser: 'safari', pwa: false, build: 'b0' }),
    ev(NOW - 1 * H, 'js_error', 'd2', 's3', { msg: 'boom' }),
    ev(NOW - 1 * H + 10, 'js_error', 'd1', 's4', { msg: 'boom' }),
    { garbage: true },
  ];

  it('liczy aktywnych, sesje, czas, błędy i akcje', () => {
    const r = aggregate(events, NOW);
    expect(r.kpi.devices).toBe(2);
    expect(r.kpi.namedDevices).toBe(1);
    expect(r.kpi.activeToday).toBe(2);
    expect(r.kpi.active7d).toBe(2);
    expect(r.kpi.active30d).toBe(2);
    expect(r.kpi.errors7d).toBe(2);
    expect(r.kpi.avgActiveSeconds).toBe(120);
    expect(r.kpi.pwaShare).toBe(50);
    expect(r.errors[0]).toMatchObject({ msg: 'boom', count: 2, devices: 2 });
    // Nieudane operacje osobno, zdarzenia techniczne poza rankingiem akcji.
    expect(r.actions).toEqual(expect.arrayContaining([
      { key: 'payment_added', count: 1 },
      { key: 'payment_added (nieudane)', count: 1 },
    ]));
    expect(r.actions.find((a) => a.key === 'page_view')).toBeUndefined();
    expect(r.tabs).toEqual([{ key: 'dashboard', count: 1 }]);
  });

  it('buduje tabelę urządzeń z imieniem i czasem aktywności', () => {
    const r = aggregate(events, NOW);
    const ola = r.devices.find((d) => d.did === 'd1');
    expect(ola).toMatchObject({ name: 'Ola', os: 'android', pwa: true, activeSeconds: 120, build: 'b1', lastTab: 'dashboard' });
    expect(r.daily).toHaveLength(30);
    expect(r.heatmap).toHaveLength(7);
    // Dwa starty aplikacji w danych (d1 dziś, d2 sprzed 40 dni) — oba trafiają na mapę.
    expect(r.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('radzi sobie z pustą bazą', () => {
    const r = aggregate([], NOW);
    expect(r.kpi.events).toBe(0);
    expect(r.devices).toEqual([]);
    expect(r.range).toEqual({ from: null, to: null });
  });
});

describe('klucz do podglądu statystyk', () => {
  it('akceptuje tylko dokładnie ten klucz', () => {
    expect(keyMatches('sekret-123', 'sekret-123')).toBe(true);
    expect(keyMatches('sekret-124', 'sekret-123')).toBe(false);
    expect(keyMatches('', 'sekret-123')).toBe(false);
    expect(keyMatches('cokolwiek', '')).toBe(false);
    expect(keyMatches(undefined, 'sekret-123')).toBe(false);
  });

  it('wyciąga klucz z nagłówka Bearer', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('Basic abc')).toBe('');
    expect(bearerToken(undefined)).toBe('');
  });
});
