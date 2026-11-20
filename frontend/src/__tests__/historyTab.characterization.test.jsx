// Charakteryzacja zakładki Historia (HistoryTab): lista i filtry, usuwanie ze
// stosem cofania, edycja z pytaniem o niezapisane zmiany i dokładne argumenty
// `updateWeek`. Chroni wydzielanie hooków i paska filtrów z tego komponentu.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { serializeBody, stubMedia } from './fixtures/domSnapshot';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn(() => ({})), onValue: vi.fn(), runTransaction: vi.fn(), set: vi.fn(),
}));
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(), getToken: vi.fn(), onMessage: vi.fn() }));

const { updateWeek, deleteWeekWithSnapshot, restoreWeek } = vi.hoisted(() => ({
  updateWeek: vi.fn(), deleteWeekWithSnapshot: vi.fn(), restoreWeek: vi.fn(),
}));
vi.mock('../lib/firebase', () => ({ updateWeek, deleteWeekWithSnapshot, restoreWeek }));

// Hasło admina jest wkompilowane z env; w teście ustawiamy znane.
vi.mock('../constants', async (importOriginal) => ({
  ...(await importOriginal()),
  ADMIN_PASSWORD: 'sekret',
  isAdminPasswordConfigured: () => true,
}));

const { downloadCsv } = vi.hoisted(() => ({ downloadCsv: vi.fn() }));
vi.mock('../utils/csv', async (importOriginal) => ({ ...(await importOriginal()), downloadCsv }));

import HistoryTab from '../components/history/HistoryTab';
import { ToastProvider } from '../components/common/Toast';
import { buildUIData, normalizeRawData } from '../lib/firebase/transforms';

const NAMES = ['Ala', 'Bartek', 'Cezary', 'Dorota'];

/**
 * 14 tygodniowych sesji: stara ping-pongowa (co 6.: stary squash z rakietami),
 * nowa squashowa z rakietami i badminton na 2 kortach.
 */
function rawWeeks() {
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.UTC(2025, 0, 1 + i * 7)).toISOString().slice(0, 10);
    const base = { id: `w${String(i + 1).padStart(2, '0')}`, date };
    if (i % 6 === 3) {
      return {
        ...base, cost: 70, sport: 'squash', present: ['Ala', 'Bartek', 'Cezary'], multiPlayers: ['Bartek'],
        racketCost: 10, ownRacketPlayers: [],
      };
    }
    if (i % 3 === 0) {
      return { ...base, cost: 45, sport: 'pingpong', present: ['Ala', 'Bartek', 'Cezary'], multiPlayers: ['Bartek'] };
    }
    if (i % 3 === 1) {
      return {
        ...base, cost: 95, sport: 'squash', present: ['Ala', 'Bartek', 'Dorota'], multiPlayers: ['Bartek'],
        racketCost: 10, ownRacketPlayers: ['Ala'], courtCount: 1, durationHours: 2,
        discountModel: 'perScan', courtGross: 115,
      };
    }
    return { ...base, cost: 60, sport: 'badminton', present: ['Cezary', 'Dorota'], multiPlayers: [], courtCount: 2, durationHours: 1 };
  });
}

const HISTORY = buildUIData(normalizeRawData({ players: NAMES, weeks: rawWeeks() })).history;

function renderHistory(overrides = {}) {
  const props = { history: HISTORY, playerNames: NAMES, singleScanPlayers: [], playSound: vi.fn(), ...overrides };
  const user = userEvent.setup();
  render(<ToastProvider><HistoryTab {...props} /></ToastProvider>);
  return { user, props };
}

const editButtons = () => screen.getAllByRole('button', { name: 'Edytuj sesję' });
const deleteButtons = () => screen.getAllByRole('button', { name: 'Usuń sesję' });

async function unlock(user) {
  const field = await screen.findByLabelText('Hasło admina');
  await user.type(field, 'sekret{Enter}');
}

describe('HistoryTab — charakteryzacja', () => {
  beforeEach(() => {
    stubMedia();
    updateWeek.mockReset().mockResolvedValue({ success: true });
    deleteWeekWithSnapshot.mockReset().mockImplementation(async (id) => ({
      success: true, deletedWeek: { id, date: '2025-01-01', cost: 45, sport: 'pingpong', present: ['Ala'], multiPlayers: [] },
    }));
    restoreWeek.mockReset().mockResolvedValue({ success: true });
    downloadCsv.mockReset();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('widok domyślny: najnowsze pierwsze, 12 z 14 sesji, przycisk „Pokaż więcej”', () => {
    renderHistory();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('widok mobilny: filtr gracza jako przycisk otwierający arkusz', async () => {
    stubMedia({ mobile: true });
    const { user } = renderHistory();
    expect(serializeBody()).toMatchSnapshot();

    await user.click(screen.getByRole('button', { name: 'Filtr gracza: wszyscy' }));
    await user.click(await screen.findByRole('button', { name: 'Dorota' }));
    expect(await screen.findByRole('button', { name: 'Filtr gracza: Dorota' })).toBeInTheDocument();
    expect(screen.getByText('9 sesji')).toBeInTheDocument();
  });

  it('filtry gracza i sportu, szukanie oraz sortowanie zawężają i porządkują listę', async () => {
    const { user } = renderHistory();
    expect(screen.getByText(/Pokazano/).textContent).toContain('12');

    await user.click(screen.getByRole('button', { name: 'Dorota' }));
    expect(screen.getByText('9 sesji')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Squash' }));
    expect(screen.getByRole('button', { name: 'Squash' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Pokazano/).textContent).toContain('5 z 5');

    await user.click(screen.getByRole('button', { name: 'Wszyscy' }));
    await user.click(screen.getByRole('button', { name: 'Wszystkie sporty' }));
    await user.type(screen.getByRole('searchbox', { name: 'Szukaj w historii' }), 'badminton');
    expect(screen.getByText(/Pokazano/).textContent).toContain('4 z 4');
    await user.clear(screen.getByRole('searchbox', { name: 'Szukaj w historii' }));

    const dates = () => screen.getAllByText(/^\d{2}\.\d{2}\.\d{4}$/).map(node => node.textContent);
    const newestFirst = dates();
    await user.click(screen.getByRole('button', { name: /Sortowanie: najnowsze pierwsze/ }));
    expect(dates()[0]).not.toBe(newestFirst[0]);
    expect(serializeBody()).toMatchSnapshot();
  });

  it('„Pokaż więcej” dokłada sesje, a zmiana filtra wraca do pierwszej strony', async () => {
    const { user } = renderHistory();
    await user.click(screen.getByRole('button', { name: /Pokaż więcej \(2 pozostało\)/ }));
    expect(screen.getByText(/Pokazano/).textContent).toContain('14 z 14');
    expect(screen.getByText('To wszystkie sesje w tym widoku.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cezary' }));
    await user.click(screen.getByRole('button', { name: 'Wszyscy' }));
    expect(screen.getByText(/Pokazano/).textContent).toContain('12 z 14');
  });

  it('eksport CSV używa nazwy z filtrem gracza', async () => {
    const { user } = renderHistory();
    await user.click(screen.getByRole('button', { name: 'Eksportuj CSV' }));
    expect(downloadCsv.mock.calls[0][0]).toBe('sesje.csv');
    await user.click(screen.getByRole('button', { name: 'Ala' }));
    await user.click(screen.getByRole('button', { name: 'Eksportuj CSV' }));
    expect(downloadCsv.mock.calls[1][0]).toBe('sesje_Ala.csv');
    expect(await screen.findByText('Wyeksportowano 10 sesji')).toBeInTheDocument();
  });

  it('usuwanie wymaga hasła, pokazuje pasek cofania i pozwala przywrócić sesję', async () => {
    const { user } = renderHistory();
    await user.click(deleteButtons()[0]);
    await user.type(await screen.findByLabelText('Hasło admina'), 'zle{Enter}');
    expect(await screen.findByText('⚠ Złe hasło')).toBeInTheDocument();
    expect(deleteWeekWithSnapshot).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Hasło admina'), 'sekret{Enter}');
    await waitFor(() => expect(deleteWeekWithSnapshot).toHaveBeenCalledWith('w14'));
    expect(await screen.findByText(/Sesja z 01\.01\.2025 usunięta/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cofnij/ }));
    await waitFor(() => expect(restoreWeek).toHaveBeenCalledTimes(1));
    expect(restoreWeek.mock.calls[0][0]).toMatchObject({ id: 'w14' });
    expect(await screen.findByText('Sesja przywrócona')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/usunięta/)).not.toBeInTheDocument());
  });

  it('drugie usunięcie nie kasuje możliwości cofnięcia pierwszego (stos cofania)', async () => {
    const { user } = renderHistory();
    await user.click(deleteButtons()[0]);
    await unlock(user);
    await screen.findByText(/Sesja z 01\.01\.2025 usunięta/);

    await user.click(deleteButtons()[1]);
    await unlock(user);
    await waitFor(() => expect(deleteWeekWithSnapshot).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/\(\+1 wcześniejsze do cofnięcia\)/)).toBeInTheDocument();

    // Cofnięcie ostatniego przywraca opcję cofnięcia poprzedniego.
    await user.click(screen.getByRole('button', { name: /Cofnij/ }));
    await waitFor(() => expect(restoreWeek).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/wcześniejsze do cofnięcia/)).not.toBeInTheDocument());
    expect(screen.getByText(/Sesja z 01\.01\.2025 usunięta/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cofnij/ }));
    await waitFor(() => expect(restoreWeek).toHaveBeenCalledTimes(2));
  });

  it('nieudane usunięcie i nieudane przywrócenie pokazują komunikat z bazy', async () => {
    deleteWeekWithSnapshot.mockResolvedValueOnce({ success: false, error: 'Nie znaleziono sesji do usunięcia' });
    const { user } = renderHistory();
    await user.click(deleteButtons()[0]);
    await unlock(user);
    expect(await screen.findByText('Nie znaleziono sesji do usunięcia')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cofnij/ })).not.toBeInTheDocument();

    restoreWeek.mockResolvedValueOnce({ success: false, error: 'Istnieje już inna sesja' });
    await user.click(deleteButtons()[0]);
    await unlock(user);
    await user.click(await screen.findByRole('button', { name: /Cofnij/ }));
    expect(await screen.findByText('Istnieje już inna sesja')).toBeInTheDocument();
  });

  it('edycja starej sesji: formularz z kosztem kortu, zapis wysyła do bazy dokładne pola', async () => {
    const { user } = renderHistory();
    // Od najnowszej: w14 (squash, nowa zasada), w13 (ping-pong, stara), w12 (badminton, 2 korty).
    await user.click(editButtons()[1]);
    await unlock(user);
    const dialog = await screen.findByRole('dialog', { name: 'Edytuj sesję' });
    expect(serializeBody()).toMatchSnapshot();

    const cost = within(dialog).getByLabelText('Koszt kortu');
    await user.clear(cost);
    await user.type(cost, '70');
    await user.click(within(dialog).getByRole('button', { name: 'Zapisz zmiany' }));

    await waitFor(() => expect(updateWeek).toHaveBeenCalledTimes(1));
    expect(updateWeek.mock.calls[0]).toMatchSnapshot();
    expect(await screen.findByText('Sesja zaktualizowana')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edytuj sesję' })).not.toBeInTheDocument());
  });

  it('edycja sesji z nową zasadą: cena przed zwrotem, rakiety i Medicover trafiają do zapisu', async () => {
    const { user } = renderHistory({ singleScanPlayers: ['Bartek'] });
    await user.click(editButtons()[0]);
    await unlock(user);
    const dialog = await screen.findByRole('dialog', { name: 'Edytuj sesję' });
    expect(serializeBody()).toMatchSnapshot();

    await user.click(within(dialog).getByRole('button', { name: 'Liczba wypożyczonych rakiet: 1' }));
    await user.click(within(dialog).getByRole('button', { name: 'Zapisz zmiany' }));
    await waitFor(() => expect(updateWeek).toHaveBeenCalledTimes(1));
    expect(updateWeek.mock.calls[0]).toMatchSnapshot();
  });

  it('edycja bez zmian nie zmienia kwoty żadnej sesji (stara z rakietami, stara bez, nowa z ceną przed zwrotem)', async () => {
    const { user } = renderHistory();
    // Od najnowszej: w14 nowa squash, w13 stary ping-pong, w12 badminton, w11 nowa squash, w10 stary squash z rakietami.
    for (const [index, id, total] of [[0, 'w14', 95], [1, 'w13', 45], [4, 'w10', 70]]) {
      updateWeek.mockClear();
      await user.click(editButtons()[index]);
      await unlock(user);
      const dialog = await screen.findByRole('dialog', { name: 'Edytuj sesję' });
      await user.click(within(dialog).getByRole('button', { name: 'Zapisz zmiany' }));
      await waitFor(() => expect(updateWeek).toHaveBeenCalledTimes(1));
      expect(updateWeek.mock.calls[0][0]).toBe(id);
      expect(updateWeek.mock.calls[0][1].cost).toBe(total);
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edytuj sesję' })).not.toBeInTheDocument());
    }
  });

  it('stara sesja z rakietami: pole kosztu pokazuje sam kort (bez rakiet)', async () => {
    const { user } = renderHistory();
    await user.click(editButtons()[4]);
    await unlock(user);
    const dialog = await screen.findByRole('dialog', { name: 'Edytuj sesję' });
    expect(within(dialog).getByLabelText('Koszt kortu')).toHaveValue('60');
    expect(serializeBody()).toMatchSnapshot();
  });

  it('błąd zapisu edycji zostawia okno otwarte i pokazuje komunikat', async () => {
    updateWeek.mockResolvedValue({ success: false, error: 'Sesja z tą datą i tym sportem już istnieje' });
    const { user } = renderHistory();
    await user.click(editButtons()[0]);
    await unlock(user);
    const dialog = await screen.findByRole('dialog', { name: 'Edytuj sesję' });
    await user.click(within(dialog).getByRole('button', { name: 'Zapisz zmiany' }));
    expect(await screen.findByText('Sesja z tą datą i tym sportem już istnieje')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Edytuj sesję' })).toBeInTheDocument();
  });

  it('niezapisane zmiany: otwarcie innego wiersza i anulowanie pytają o odrzucenie', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = renderHistory();
    await user.click(editButtons()[1]);
    await unlock(user);
    const dialog = await screen.findByRole('dialog', { name: 'Edytuj sesję' });

    // Bez zmian anulowanie nie pyta.
    await user.click(within(dialog).getByRole('button', { name: 'Anuluj edycję' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edytuj sesję' })).not.toBeInTheDocument());
    expect(confirm).not.toHaveBeenCalled();

    await user.click(editButtons()[1]);
    await unlock(user);
    const reopened = await screen.findByRole('dialog', { name: 'Edytuj sesję' });
    await user.type(within(reopened).getByLabelText('Koszt kortu'), '1');

    // Odmowa zostawia formularz; zgoda go zamyka.
    await user.click(within(reopened).getByRole('button', { name: 'Anuluj edycję' }));
    expect(confirm).toHaveBeenLastCalledWith('Masz niezapisane zmiany w edytowanej sesji. Odrzucić je?');
    expect(screen.getByRole('dialog', { name: 'Edytuj sesję' })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(within(reopened).getByRole('button', { name: 'Anuluj edycję' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edytuj sesję' })).not.toBeInTheDocument());
  });

  it('pusta historia pokazuje stan pusty, a brak wyników filtra — osobny komunikat', async () => {
    const { user } = renderHistory({ history: [] });
    expect(screen.getByText('Brak danych')).toBeInTheDocument();
    expect(screen.getByText('Dodaj pierwszą sesję w zakładce Dodaj.')).toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();
    expect(user).toBeDefined();
  });

  it('brak wyników dla wybranych filtrów', async () => {
    const { user } = renderHistory();
    await user.type(screen.getByRole('searchbox', { name: 'Szukaj w historii' }), 'zzzz');
    expect(screen.getByText('Brak sesji dla wybranych filtrów.')).toBeInTheDocument();
  });
});
