/**
 * START APLIKACJI BEZ POŁĄCZENIA
 *
 * Zgłoszona usterka: „wyłączyłem internet, rozliczyłem gracza, włączyłem internet
 * i apka się nie ładuje — kręci się na CONNECTING TO FIREBASE, a potem uruchamia
 * w trybie offline BEZ DANYCH”.
 *
 * Pusta aplikacja wygląda dla użytkownika jak zepsuta, nawet jeśli formalnie
 * działa. Te testy pilnują, że start korzysta z ostatnich znanych danych i że
 * uszkodzona pamięć podręczna nie stanie się nowym sposobem na zepsucie startu.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  set: vi.fn(),
  runTransaction: vi.fn(),
  goOffline: vi.fn(),
  goOnline: vi.fn(),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
}));

// Baza milczy — dokładnie jak przy braku sieci albo zerwanym połączeniu.
vi.mock('../lib/firebase/index', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, subscribeToData: vi.fn(() => () => {}) };
});

const { AppDataProvider } = await import('../app/providers/AppDataProvider');
const { useConnectionStatus, useDashboard } = await import('../app/providers/appDataContext');
const { ToastProvider } = await import('../components/common/Toast');

const SNAPSHOT_KEY = 'cyber-ponk-data-snapshot';

const SAMPLE = {
  players: ['Krzysiek', 'Kamil'],
  weeks: [
    { id: 'w1', date: '2026-08-01', cost: 40, present: ['Krzysiek', 'Kamil'] },
    { id: 'w2', date: '2026-08-08', cost: 40, present: ['Krzysiek'] },
  ],
  defaultMultiPlayers: [],
  playerJoinDate: {},
  deletedPlayers: [],
  payments: { Krzysiek: [{ id: 'p1', amount: 20, date: '2026-08-02' }] },
};

/** Wypisuje to, co widzi interfejs zaraz po starcie — bez czekania na bazę. */
function Probe() {
  const { hasData, isLoading } = useConnectionStatus();
  const { players, summary } = useDashboard();
  return (
    <div>
      <span data-testid="hasData">{String(hasData)}</span>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="players">{players.map(p => p.name).join(',')}</span>
      <span data-testid="weeks">{String(summary.totalWeeks)}</span>
    </div>
  );
}

function renderApp() {
  return render(
    <ToastProvider>
      <AppDataProvider>
        <Probe />
      </AppDataProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('start z ostatnich znanych danych', () => {
  /**
   * Najważniejszy test tej zmiany. Bez pamięci podręcznej użytkownik bez zasięgu
   * czekał 15 sekund na ekranie startowym, po czym dostawał puste listy.
   */
  it('pokazuje zapamiętane dane od razu, gdy baza milczy', () => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), data: SAMPLE }));

    renderApp();

    expect(screen.getByTestId('hasData').textContent).toBe('true');
    expect(screen.getByTestId('players').textContent).toContain('Krzysiek');
    expect(screen.getByTestId('weeks').textContent).toBe('2');
  });

  // `hasData` otwiera bramkę renderowania w `AppShell`, więc ekran startowy
  // nie ma prawa się pojawić, skoro jest co pokazać.
  it('nie zatrzymuje się na ekranie startowym, mając zapamiętane dane', () => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), data: SAMPLE }));

    renderApp();

    expect(screen.getByTestId('hasData').textContent).toBe('true');
  });

  it('bez zapamiętanych danych czeka na bazę jak dotąd', () => {
    renderApp();

    expect(screen.getByTestId('hasData').textContent).toBe('false');
    expect(screen.getByTestId('isLoading').textContent).toBe('true');
  });

  // Uszkodzony wpis nie może zamienić się w nowy sposób na zablokowanie startu —
  // to ta sama klasa awarii, którą naprawia cała reszta zmiany.
  it('uszkodzona pamięć podręczna nie wywraca startu', () => {
    localStorage.setItem(SNAPSHOT_KEY, '{{{ to nie jest json');

    expect(() => renderApp()).not.toThrow();
    expect(screen.getByTestId('hasData').textContent).toBe('false');
  });

  it('wpis o nieoczekiwanym kształcie jest pomijany', () => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ version: 1, data: { players: 'nie tablica', weeks: null } }));

    expect(() => renderApp()).not.toThrow();
    expect(screen.getByTestId('hasData').textContent).toBe('false');
  });
});
