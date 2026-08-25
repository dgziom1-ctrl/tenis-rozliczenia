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
import { render, screen } from '@testing-library/react';
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
vi.mock('../lib/firebase/index', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, subscribeToData: vi.fn(() => () => {}) };
});

// ─── Importy komponentów ────────────────────────────────────────────────────
import App from '../app/App';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import Navigation from '../components/layout/Navigation';
import UndoBar from '../components/common/UndoBar';
import LogEntry from '../components/history/LogEntry';
import LiveCostPreview from '../components/admin/LiveCostPreview';
import { getShareGroups } from '../utils/sessionCost';
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
    expect(screen.getByText('CYBER-PONK')).toBeInTheDocument();
  });

  it('nie pokazuje zakładek dopóki dane nie są gotowe', () => {
    render(<App />);
    // Nawigacja pojawia się dopiero po załadowaniu danych
    expect(screen.queryByText('HOME')).not.toBeInTheDocument();
  });

  it('subscribeToData jest wywołane przy montowaniu', async () => {
    const { subscribeToData } = await import('../lib/firebase/index');
    render(<App />);
    expect(subscribeToData).toHaveBeenCalledTimes(1);
  });

  it('wywołuje funkcję cleanup Firebase przy odmontowaniu', async () => {
    const unsub = vi.fn();
    const { subscribeToData } = await import('../lib/firebase/index');
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
    expect(screen.getAllByText('HOME').length).toBeGreaterThan(0);
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

// ════════════════════════════════════════════════════════════════════════════
// Stawki na ekranie — muszą się zgadzać z podziałem, który trafia do sald
// ════════════════════════════════════════════════════════════════════════════

describe('LogEntry — koszt i stawki w historii', () => {
  // Kort 100 zł + rakiety 16 zł. Ada ma kartę i własną rakietkę, Bartek kartę
  // i wypożycza, Celina z Dawidem płacą pełną stawkę z rakietką.
  const row = {
    id: 'sesja-1234',
    datePlayed: '2026-08-25',
    sport: 'badminton',
    totalCost: 116,
    racketCost: 16,
    costPerPerson: 37.83,
    costPerPersonMulti: 20.17,
    presentPlayers: ['Ada', 'Bartek', 'Celina', 'Dawid'],
    multisportPlayers: ['Ada', 'Bartek'],
    ownRacketPlayers: ['Ada'],
  };

  const renderRow = () => render(<LogEntry row={row} onEdit={vi.fn()} onDelete={vi.fn()} />);

  it('pokazuje koszt całkowity razem z rozbiciem na kort i rakiety', () => {
    renderRow();
    expect(screen.getByText('116,00 zł')).toBeInTheDocument();
    expect(screen.getByText('kort 100,00 · rakiety 16,00')).toBeInTheDocument();
  });

  it('pokazuje stawkę i liczbę osób w każdej grupie', () => {
    renderRow();
    expect(screen.getByText('bez karty')).toBeInTheDocument();
    expect(screen.getByText('37,83 zł')).toBeInTheDocument();
    expect(screen.getByText('⚡ z kartą')).toBeInTheDocument();
    expect(screen.getByText('22,84 zł')).toBeInTheDocument();
    expect(screen.getByText('17,50 zł')).toBeInTheDocument();
    expect(screen.getByText('· 2 os.')).toBeInTheDocument();
  });

  // 2 × 37,83 + 22,84 + 17,50 = 116,00 — dokładnie tyle, ile kosztowała sesja.
  it('stawki razy liczba osób dają koszt całkowity', () => {
    const groups = getShareGroups(row);
    const collected = groups.reduce((acc, g) => acc + g.perPerson * g.names.length, 0);
    expect(collected).toBeCloseTo(row.totalCost, 2);
  });

  it('oznacza posiadaczy karty przy nazwisku', () => {
    renderRow();
    expect(screen.getByText('⚡🏸 Ada')).toBeInTheDocument();
    expect(screen.getByText('⚡ Bartek')).toBeInTheDocument();
    expect(screen.getByText('Celina')).toBeInTheDocument();
  });
});

describe('LiveCostPreview — podgląd nie może obiecać innej kwoty niż zapłacona', () => {
  // Regresja: przy zniżkach większych niż rachunek podgląd pokazywał 7,67 zł
  // od osoby, czyli 23 zł do zebrania z 1 zł zostawionego w recepcji.
  const props = {
    totalCost: '1',
    presentPlayers: ['Rafał', 'Kamil', 'Przemek', 'Mariusz', 'Arek', 'Krzysiek'],
    multisportPlayers: ['Rafał', 'Kamil', 'Krzysiek'],
    sport: 'pingpong',
  };

  it('pokazuje stawki, które sumują się do wpisanej kwoty', () => {
    render(<LiveCostPreview {...props} />);
    expect(screen.getByText('0,33 zł')).toBeInTheDocument();
    expect(screen.getByText('0,00 zł')).toBeInTheDocument();
    expect(screen.queryByText('7,67 zł')).not.toBeInTheDocument();
  });

  it('ostrzega, że karty nie weszły w pełnej wysokości', () => {
    render(<LiveCostPreview {...props} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Karty nie zbiły ceny o pełne 15 zł/);
  });

  // Kort 156 zł, trzy karty zbijają go do 111 zł: 156/6 = 26 zł pełnej stawki,
  // 11 zł dla posiadaczy kart. 3 × 26 + 3 × 11 = 111.
  it('przy normalnej kwocie nie ostrzega i daje pełne 15 zł różnicy', () => {
    render(<LiveCostPreview {...props} totalCost="111" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('26,00 zł')).toBeInTheDocument();
    expect(screen.getByText('11,00 zł')).toBeInTheDocument();
  });
});
