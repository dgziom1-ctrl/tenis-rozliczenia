import '@testing-library/jest-dom';

// ─── Wycisz console.error podczas testów ErrorBoundary ───────────────────────
// React loguje stack trace każdego błędu złapanego przez ErrorBoundary —
// zaśmiecałoby to output testów, które celowo testują ścieżkę błędu.
const originalError = console.error.bind(console);
beforeEach(() => {
  console.error = (...args) => {
    const msg = String(args[0]);
    // Przepuść tylko błędy, które nie są oczekiwane w testach komponentów
    if (
      msg.includes('ErrorBoundary caught') ||
      msg.includes('The above error occurred') ||
      msg.includes('Consider adding an error boundary') ||
      msg.includes('act(')
    ) return;
    originalError(...args);
  };
});
afterEach(() => {
  console.error = originalError;
});

// ─── Web Storage ─────────────────────────────────────────────────────────────
// Node 25+ ma wbudowany `localStorage`, który bez `--localstorage-file` jest
// bezużyteczny i przesłania ten z jsdom. Podstawiamy prosty magazyn w pamięci,
// żeby testy nie zależały od wersji Node.
for (const name of ['localStorage', 'sessionStorage']) {
  if (typeof globalThis[name]?.clear === 'function') continue;
  const data = new Map();
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: {
      get length() { return data.size; },
      key: (i) => [...data.keys()][i] ?? null,
      getItem: (k) => (data.has(String(k)) ? data.get(String(k)) : null),
      setItem: (k, v) => { data.set(String(k), String(v)); },
      removeItem: (k) => { data.delete(String(k)); },
      clear: () => data.clear(),
    },
  });
}

// ─── Domyślne mocki dla API przeglądarki niedostępnych w jsdom ───────────────

// Audio API (jsdom go nie ma)
globalThis.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { setValueAtTime: vi.fn() }, type: '' })),
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
}));

// Canvas 2D — jsdom nie implementuje `getContext` i loguje „Not implemented”
// przy każdym renderze nagłówka. Aplikacja sama radzi sobie z brakiem
// kontekstu (patrz ArenaCanvas), więc w testach wystarczy `null`.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

// matchMedia (jsdom go nie ma, używany przez hooki motywu)
globalThis.matchMedia = vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
