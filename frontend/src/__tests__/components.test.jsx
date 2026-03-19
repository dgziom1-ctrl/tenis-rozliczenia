/**
 * TESTY KOMPONENTÓW — RENDEROWANIE
 *
 * Cel: sprawdzić że komponenty renderują się bez crashu i pokazują
 * oczekiwane elementy UI. To jest poziom testów, który BY ZŁAPAŁ
 * oryginalny błąd — apka nie mogła się w ogóle wyrenderować.
 *
 * Zasada: jeśli `render(<App />)` rzuci wyjątek, test przepada.
 * Nie trzeba sprawdzać całego UI — sam fakt że coś się wyrenderowało
 * już jest wartościową informacją.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocki Firebase (muszą być przed importami komponentów) ─────────────────
vi.mock('firebase/app',      () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase:    vi.fn(() => ({})),
  ref:            vi.fn(() => ({})),
  onValue:        vi.fn(),
  runTransaction: vi.fn(),
  set:            vi.fn(),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken:     vi.fn(),
  onMessage:    vi.fn(),
}));

// subscribeToData nigdy nie wywołuje callbacku → apka zostaje w stanie ładowania
vi.mock('../firebase/index', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, subscribeToData: vi.fn(() => () => {}) };
});

// ─── Importy komponentów ────────────────────────────────────────────────────
import App from '../App';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import Navigation from '../components/layout/Navigation';
import UndoBar from '../components/common/UndoBar';
import { TABS } from '../constants';

// ════════════════════════════════════════════════════════════════════════════
// App — smoke test
// ════════════════════════════════════════════════════════════════════════════

describe('App — smoke test', () => {
  beforeEach(() => vi.clearAllMocks());

  it('🔴 renderuje się bez crashu', () => {
    // Najważniejszy test w całej apce.
    // Gdyby istniał przed naszą naprawą, od razu by wykrył problem.
    expect(() => render(<App />)).not.toThrow();
  });

  it('pokazuje ekran ładowania na starcie (zanim Firebase odpowie)', () => {
    render(<App />);
    // Tekst na ekranie ładowania
    expect(screen.getByText('CYBER-PONG')).toBeInTheDocument();
  });

  it('nie pokazuje zakładek dopóki dane nie są gotowe', () => {
    render(<App />);
    // Nawigacja pojawia się dopiero po załadowaniu danych
    expect(screen.queryByText('BAZA')).not.toBeInTheDocument();
  });

  it('subscribeToData jest wywołane przy montowaniu', async () => {
    const { subscribeToData } = await import('../firebase/index');
    render(<App />);
    expect(subscribeToData).toHaveBeenCalledTimes(1);
  });

  it('wywołuje funkcję cleanup Firebase przy odmontowaniu', async () => {
    const unsub = vi.fn();
    const { subscribeToData } = await import('../firebase/index');
    subscribeToData.mockReturnValueOnce(unsub);

    const { unmount } = render(<App />);
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ErrorBoundary
// Ten komponent widzą użytkownicy gdy coś się zepsuje.
// Ważne żeby sam nie był zepsuty.
// ════════════════════════════════════════════════════════════════════════════

describe('ErrorBoundary — zachowanie', () => {
  it('renderuje children gdy nie ma błędu', () => {
    render(
      <ErrorBoundary>
        <div>Wszystko OK</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Wszystko OK')).toBeInTheDocument();
  });

  it('pokazuje komunikat błędu gdy child rzuca wyjątek', () => {
    const Throw = () => { throw new Error('test crash'); };

    render(
      <ErrorBoundary>
        <Throw />
      </ErrorBoundary>
    );

    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument();
  });

  it('pokazuje przycisk odświeżenia po błędzie', () => {
    const Throw = () => { throw new Error('test'); };

    render(<ErrorBoundary><Throw /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: /odśwież/i })).toBeInTheDocument();
  });

  it('ukrywa szczegóły błędu w trybie produkcyjnym', () => {
    const originalEnv = import.meta.env.MODE;
    // jsdom domyślnie nie ustawia NODE_ENV=development
    const Throw = () => { throw new Error('sekretny błąd'); };

    render(<ErrorBoundary><Throw /></ErrorBoundary>);
    // Szczegóły błędu powinny być ukryte (process.env.NODE_ENV !== 'development')
    expect(screen.queryByText(/sekretny błąd/)).not.toBeInTheDocument();
  });

  it('nie crashuje bez children', () => {
    expect(() => render(<ErrorBoundary />)).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Navigation
// ════════════════════════════════════════════════════════════════════════════

describe('Navigation — renderowanie zakładek', () => {
  it('renderuje się bez crashu', () => {
    const setTab = vi.fn();
    expect(() => render(
      <Navigation activeTab={TABS.DASHBOARD} setActiveTab={setTab} />
    )).not.toThrow();
  });

  it('pokazuje wszystkie 5 zakładek', () => {
    render(<Navigation activeTab={TABS.DASHBOARD} setActiveTab={vi.fn()} />);
    // Komponent renderuje dwie nawigacje (desktop + mobile) — obie zawierają te same
    // etykiety, więc getAllByText zamiast getByText (które rzuciłoby "multiple elements").
    expect(screen.getAllByText('BAZA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RANKING').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DODAJ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HISTORIA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GRACZE').length).toBeGreaterThan(0);
  });

  it('wywołuje setActiveTab po kliknięciu zakładki', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();

    render(<Navigation activeTab={TABS.DASHBOARD} setActiveTab={setTab} />);
    // Klikamy pierwszy znaleziony przycisk z tym tekstem (desktop nav)
    await user.click(screen.getAllByText('HISTORIA')[0]);
    expect(setTab).toHaveBeenCalledWith(TABS.HISTORY);
  });

  it('zmienia aktywną zakładkę po kliknięciu każdej', async () => {
    const user = userEvent.setup();
    const setTab = vi.fn();
    render(<Navigation activeTab={TABS.DASHBOARD} setActiveTab={setTab} />);

    for (const [label, tabId] of [
      ['RANKING',  TABS.ATTENDANCE],
      ['DODAJ',    TABS.ADMIN],
      ['HISTORIA', TABS.HISTORY],
      ['GRACZE',   TABS.PLAYERS],
    ]) {
      await user.click(screen.getAllByText(label)[0]);
      expect(setTab).toHaveBeenLastCalledWith(tabId);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UndoBar
// ════════════════════════════════════════════════════════════════════════════

describe('UndoBar — wyświetlanie i interakcja', () => {
  const defaultProps = {
    message: 'Opłacono: Alice',
    secondsLeft: 6,
    progressPct: 75,
    onUndo: vi.fn(),
  };

  it('renderuje się bez crashu', () => {
    expect(() => render(<UndoBar {...defaultProps} />)).not.toThrow();
  });

  it('pokazuje wiadomość', () => {
    render(<UndoBar {...defaultProps} />);
    expect(screen.getByText('Opłacono: Alice')).toBeInTheDocument();
  });

  it('wywołuje onUndo po kliknięciu przycisku COFNIJ', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();

    render(<UndoBar {...defaultProps} onUndo={onUndo} />);
    await user.click(screen.getByRole('button', { name: /cofnij/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('pokazuje licznik sekund', () => {
    render(<UndoBar {...defaultProps} secondsLeft={4} />);
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });
});
