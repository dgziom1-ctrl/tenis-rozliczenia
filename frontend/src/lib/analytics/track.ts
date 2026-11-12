import { getAnalyticsPlayer, getDeviceId, isOptedOut, SESSION_ID } from './identity';

/**
 * Zbieranie zdarzeń użycia aplikacji.
 *
 * Zasady: nigdy nie rzuca, nigdy nie blokuje UI, nic nie robi w testach, trybie
 * demo ani po wyłączeniu na urządzeniu. Zdarzenia trafiają do kolejki i jadą do
 * bazy wsadowo (jeden zapis na kilka sekund), a przy ukryciu karty od razu.
 * Odczyt jest zablokowany w regułach bazy — statystyki ogląda tylko właściciel,
 * przez funkcję `stats` (patrz `docs/ANALYTICS.md`).
 */

export type PropValue = string | number | boolean;
export type EventProps = Record<string, PropValue | null | undefined>;

/** Kształt wpisu w `analytics/events/$id` — musi zgadzać się z `database.rules.json`. */
export interface AnalyticsEvent {
  ts: number;
  type: string;
  did: string;
  sid: string;
  name?: string;
  props?: Record<string, PropValue>;
}

export type Sink = (events: AnalyticsEvent[]) => Promise<void>;

const FLUSH_INTERVAL_MS = 5_000;
const MAX_QUEUE = 60;
/** Bezpiecznik przed pętlą, która zalałaby bazę zdarzeniami z jednej sesji. */
const MAX_EVENTS_PER_SESSION = 1_500;
const MAX_PROPS = 12;
const MAX_STRING = 100;
const MAX_KEY = 24;

let queue: AnalyticsEvent[] = [];
let sentThisSession = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = false;
let sink: Sink | null = null;

/** Przycina i filtruje właściwości do tego, co przepuszczają reguły bazy. */
export function cleanProps(props: EventProps | undefined): Record<string, PropValue> | undefined {
  if (!props) return undefined;
  const out: Record<string, PropValue> = {};
  let count = 0;
  for (const [rawKey, value] of Object.entries(props)) {
    if (count >= MAX_PROPS) break;
    const key = rawKey.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, MAX_KEY);
    if (!key || value === null || value === undefined) continue;
    if (typeof value === 'string') {
      if (value === '') continue;
      out[key] = value.slice(0, MAX_STRING);
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
    } else if (typeof value === 'boolean') {
      out[key] = value;
    } else continue;
    count += 1;
  }
  return count > 0 ? out : undefined;
}

export function buildEvent(type: string, props?: EventProps, now: number = Date.now()): AnalyticsEvent {
  const event: AnalyticsEvent = {
    ts: now,
    type: type.replace(/[^a-z0-9_]/g, '_').slice(0, 32),
    did: getDeviceId(),
    sid: SESSION_ID,
  };
  const name = getAnalyticsPlayer();
  if (name) event.name = name;
  const clean = cleanProps(props);
  if (clean) event.props = clean;
  return event;
}

async function sendBatch(batch: AnalyticsEvent[]): Promise<void> {
  const send = sink ?? (await import('./firebaseSink')).firebaseSink;
  await send(batch);
}

/** Wysyła kolejkę. Błąd sieci przy braku internetu zostawia zdarzenia na później. */
export async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!enabled || queue.length === 0) return;
  const batch = queue;
  queue = [];
  try {
    await sendBatch(batch);
  } catch {
    // Offline: zachowaj (z limitem). Inny błąd (np. reguły) = porzuć, bez pętli.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      queue = [...batch, ...queue].slice(-MAX_QUEUE);
    }
  }
}

function schedule(): void {
  if (timer) return;
  timer = setTimeout(() => { void flush(); }, FLUSH_INTERVAL_MS);
}

/** Zapisuje zdarzenie. Bezpieczne do wołania zewsząd — przy wyłączonej analityce nic nie robi. */
export function track(type: string, props?: EventProps): void {
  try {
    if (!enabled || sentThisSession >= MAX_EVENTS_PER_SESSION) return;
    sentThisSession += 1;
    queue.push(buildEvent(type, props));
    if (queue.length >= MAX_QUEUE) void flush();
    else schedule();
  } catch { /* statystyki nie mogą niczego zepsuć */ }
}

/** Czy zbieranie jest w tej chwili aktywne (zależy od środowiska i zgody właściciela). */
export function isTracking(): boolean {
  return enabled;
}

/**
 * Włącza zbieranie. `sinkOverride` służy testom. Zwraca, czy włączono.
 * Wyłączone w testach, trybie demo, `npm run dev` oraz na urządzeniu właściciela.
 */
export function enableTracking(options: { allowed: boolean; sinkOverride?: Sink }): boolean {
  enabled = options.allowed && !isOptedOut();
  sink = options.sinkOverride ?? null;
  return enabled;
}

/** Tylko do testów: czyści kolejkę i wyłącza zbieranie. */
export function resetTracking(): void {
  if (timer) { clearTimeout(timer); timer = null; }
  queue = [];
  sentThisSession = 0;
  enabled = false;
  sink = null;
}
