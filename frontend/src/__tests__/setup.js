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

// matchMedia (jsdom go nie ma, używany przez hooki motywu)
globalThis.matchMedia = vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
