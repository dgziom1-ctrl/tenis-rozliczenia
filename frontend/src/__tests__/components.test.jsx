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
import { PasswordModal } from '../components/common/SharedUI';
import PlayerSessionModal from '../components/attendance/PlayerSessionModal';
import PlayerCard from '../components/dashboard/PlayerCard';
import { buildPlayerCardMeta } from '../utils/playerCard';
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

// ════════════════════════════════════════════════════════════════════════════
// PasswordModal — regresja: nie dało się nic wpisać
// Pułapka fokusu przenosiła fokus na kontener okna JUŻ PO tym, jak autoFocus
// ustawił go na polu hasła. Pole traciło fokus, klawiatura na telefonie się
// nie otwierała, a wpisywanie nic nie dawało. Dotyczyło edycji sesji,
// usuwania sesji i usuwania gracza — wszystkich miejsc z tym oknem.
// ════════════════════════════════════════════════════════════════════════════

describe('PasswordModal — pole hasła musi trzymać fokus', () => {
  it('po otwarciu fokus jest na polu hasła, a nie na kontenerze', () => {
    render(<PasswordModal action="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const input = screen.getByLabelText('Hasło admina');
    expect(document.activeElement).toBe(input);
  });

  it('da się wpisać tekst i trafia on do pola', async () => {
    const user = userEvent.setup();
    render(<PasswordModal action="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    // Bez click() — piszemy od razu, bo fokus ma już być na polu.
    await user.keyboard('sekret');

    expect(screen.getByLabelText('Hasło admina')).toHaveValue('sekret');
  });

  it('Escape zamyka okno, mimo że fokus jest w polu', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PasswordModal action="Test" onConfirm={vi.fn()} onCancel={onCancel} />);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('blokuje przewijanie strony pod otwartym oknem', () => {
    const { unmount } = render(<PasswordModal onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});

describe('LiveCostPreview — podgląd nie może obiecać innej kwoty niż zapłacona', () => {
  // Regresja: przy zniżkach większych niż rachunek podgląd pokazywał 7,67 zł
  // od osoby, czyli 23 zł do zebrania z 1 zł zostawionego w recepcji.
  const props = {
    totalCost: '1',
    presentPlayers: ['Rafał', 'Kamil', 'Przemek', 'Mariusz', 'Arek', 'Krzysiek'],
    multisportPlayers: ['Rafał', 'Kamil', 'Krzysiek'],
    sport: 'badminton',
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

// ════════════════════════════════════════════════════════════════════════════
// PlayerSessionModal — dane zgodne z wybranym sezonem
// ════════════════════════════════════════════════════════════════════════════

describe('PlayerSessionModal — zakres idzie za wybranym sezonem', () => {
  const session = (id, datePlayed) => ({
    id, datePlayed,
    sport: 'pingpong',
    totalCost: 30, costPerPerson: 30, costPerPersonMulti: 15,
    presentPlayers: ['Ala'], multisportPlayers: [],
  });

  // 5 grudniowych sesji 2026 (Ala na każdej) + jedna w 2027.
  const fullHistory = [
    session('s6', '2027-01-12'),
    session('s5', '2026-12-15'),
    session('s4', '2026-12-08'),
    session('s3', '2026-12-01'),
    session('s2', '2026-11-24'),
    session('s1', '2026-11-17'),
  ];
  const season2027 = fullHistory.filter(s => s.datePlayed.startsWith('2027'));

  const basePlayer = {
    name: 'Ala', currentDebt: 0, joinDate: null,
    attendanceCount: 6, eligibleWeeks: 6, attendancePercentage: 100, currentStreak: 6,
  };

  it('sezon 2027: sesje, odznaki i seria tylko z 2027', () => {
    render(
      <PlayerSessionModal
        player={{ ...basePlayer, attendanceCount: 1, eligibleWeeks: 1, currentStreak: 1 }}
        history={season2027}
        seasonLabel="2027"
        onClose={() => {}}
      />,
    );

    expect(screen.getByText(/2027 · 1\/1 sesji/)).toBeInTheDocument();
    // Debiut odblokowuje się w każdym sezonie, w którym gracz zagrał...
    expect(screen.getByLabelText(/Debiut/)).toBeInTheDocument();
    // ...ale seria 5 z grudnia do stycznia nie przechodzi.
    expect(screen.queryByLabelText(/Seria 5/)).not.toBeInTheDocument();
    expect(screen.getByText(/osiągnięcia · 2027/)).toBeInTheDocument();
  });

  it('wszystkie sezony: pełen dorobek z kariery', () => {
    render(
      <PlayerSessionModal
        player={basePlayer}
        history={fullHistory}
        seasonLabel={null}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText(/wszystkie sezony · 6\/6 sesji/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Debiut/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seria 5/)).toBeInTheDocument();
    expect(screen.getByText(/osiągnięcia · wszystkie sezony/)).toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PlayerCard — czysta karta FIFA (Wariant A)
// ════════════════════════════════════════════════════════════════════════════

describe('PlayerCard — Wariant A (czysta karta FIFA)', () => {
  const player = {
    name: 'Ala',
    currentDebt: 45,
    joinDate: null,
    attendanceCount: 5,
    eligibleWeeks: 6,
    attendancePercentage: 83,
    currentStreak: 3,
  };
  const history = [
    {
      id: 's1',
      datePlayed: '2026-03-01',
      sport: 'pingpong',
      totalCost: 60,
      costPerPerson: 30,
      costPerPersonMulti: 15,
      presentPlayers: ['Ala'],
      multisportPlayers: [],
    },
  ];
  const meta = buildPlayerCardMeta(player, history);

  it('pokazuje OVR, imię, rangę z procentem i serię, bez paska obecności, sportów i odznak', () => {
    render(
      <PlayerCard
        player={player}
        meta={meta}
        openDetails={false}
        onToggleDetails={vi.fn()}
        breakdown={null}
        onAddPayment={vi.fn()}
        onRemovePayment={vi.fn()}
        onPin={vi.fn()}
        onUnpin={vi.fn()}
        playSound={vi.fn()}
      />,
    );

    expect(screen.getByText(String(meta.overall))).toBeInTheDocument();
    expect(screen.getByText('OVR')).toBeInTheDocument();
    expect(screen.getByText('Ala')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ranga MISTRZ, 83% frekwencji/ })).toBeInTheDocument();
    expect(screen.getByText(/SERIA 3/i)).toBeInTheDocument();

    // Usunięte elementy nie zaśmiecają karty
    expect(screen.queryByText('Obecność')).not.toBeInTheDocument();
    expect(screen.queryByText('5/6')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Osiągnięcia')).not.toBeInTheDocument();
  });
});

