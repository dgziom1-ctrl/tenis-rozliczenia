/** Kształt odpowiedzi funkcji `stats` (patrz `functions/analyticsAggregate.js`). */
export interface StatsDevice {
  did: string;
  name: string;
  firstSeen: number;
  lastSeen: number;
  sessions: number;
  events: number;
  activeSeconds: number;
  os: string;
  browser: string;
  model: string;
  pwa: boolean;
  screen: string;
  lang: string;
  build: string;
  lastTab: string;
  errors: number;
}

export interface StatsCount { key: string; count: number }

export interface StatsEvent {
  ts: number;
  type: string;
  did: string;
  name: string;
  props: Record<string, string | number | boolean>;
}

export interface StatsData {
  generatedAt: number;
  truncated: boolean;
  range: { from: number | null; to: number | null };
  kpi: {
    events: number;
    devices: number;
    namedDevices: number;
    activeToday: number;
    active7d: number;
    active30d: number;
    newDevices7d: number;
    sessions7d: number;
    avgActiveSeconds: number;
    errors7d: number;
    pwaShare: number;
    medianDataReadyMs: number | null;
  };
  daily: { day: string; devices: number; sessions: number; events: number; errors: number }[];
  /** [dzień tygodnia pn…nd][godzina 0–23] = liczba uruchomień aplikacji. */
  heatmap: number[][];
  devices: StatsDevice[];
  tabs: StatsCount[];
  actions: StatsCount[];
  errors: { type: string; msg: string; count: number; devices: number; last: number }[];
  push: { permission: Record<string, number>; registered: number; errors: number; opened: number };
  versions: StatsCount[];
  recent: StatsEvent[];
}

export class StatsAuthError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'StatsAuthError';
  }
}

/** Adres funkcji — hosting przekierowuje go na `stats` (firebase.json), więc bez CORS. */
const ENDPOINT = '/__stats';

export async function fetchStats(key: string, signal?: AbortSignal): Promise<StatsData> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal,
  });
  // Zły klucz i brak funkcji wyglądają tak samo (404) — dla klienta to „brak dostępu”.
  if (response.status === 404 || response.status === 401 || response.status === 403) throw new StatsAuthError();
  if (!response.ok) throw new Error(`Błąd ${response.status}`);
  return (await response.json()) as StatsData;
}
