// Charakteryzacja formularza „Dodaj nową sesję" (AdminTab).
//
// Zapisuje to, co widać i słychać dziś (DOM jako stabilny tekst — patrz
// `fixtures/domSnapshot.js`) oraz dokładne argumenty `addSession`, czyli to,
// co trafia do bazy. Chroni wydzielanie wspólnych części formularzy przed
// cichą zmianą tekstów, ARIA, stanów i kwot.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { serializeBody, stubMedia } from './fixtures/domSnapshot';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})), ref: vi.fn(() => ({})), onValue: vi.fn(), runTransaction: vi.fn(), set: vi.fn(),
}));
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(), getToken: vi.fn(), onMessage: vi.fn() }));

const { addSession } = vi.hoisted(() => ({ addSession: vi.fn() }));
vi.mock('../lib/firebase', () => ({ addSession }));

import AdminTab from '../components/admin/AdminTab';
import { ToastProvider } from '../components/common/Toast';

const NAMES = ['Ala', 'Bartek', 'Cezary', 'Dorota'];

const PLAYERS = NAMES.map(name => ({
  name, attendanceCount: 3, currentDebt: 0, eligibleWeeks: 4, joinDate: null,
}));

/** Ostatnia sesja: squash, 2 korty na 2 h, nowa zasada, cena kortu 100 zł. */
const LAST_SESSION = {
  id: 'h1', datePlayed: '2025-06-01', totalCost: 90, sport: 'squash',
  costPerPerson: 0, costPerPersonMulti: 0,
  presentPlayers: ['Ala', 'Bartek', 'Cezary'], multisportPlayers: ['Bartek'],
  courtCount: 2, durationHours: 2, discountModel: 'perScan', courtGross: 100,
};

function renderAdmin(overrides = {}) {
  const props = {
    playerNames: NAMES, defaultMultiPlayers: ['Bartek'], singleScanPlayers: ['Cezary'],
    history: [], players: PLAYERS, setActiveTab: vi.fn(), playSound: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  render(<ToastProvider><AdminTab {...props} /></ToastProvider>);
  return { user, props };
}

/** Grupa pól o danej etykiecie („Kto grał?", „Własna rakietka"…). */
const group = label => within(screen.getByText(label).closest('.glass-panel'));

async function typeInto(user, field, text) {
  await user.clear(field);
  if (text) await user.type(field, text);
}

describe('AdminTab — charakteryzacja', () => {
  beforeEach(() => {
    stubMedia();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2025-06-15T12:00:00'));
    addSession.mockReset();
    addSession.mockResolvedValue({ success: true });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('stan startowy: wszyscy obecni, karty z cech graczy, ping-pong, 1 stół na 1 h', () => {
    renderAdmin();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('nowa sesja startuje składem, sportem, kortami i godzinami z ostatniej sesji', () => {
    renderAdmin({ history: [LAST_SESSION] });
    expect(serializeBody()).toMatchSnapshot();
  });

  it('padel z 2 kortami na 2 h, rakietami, własną rakietką i ceną kortu', async () => {
    const { user } = renderAdmin();
    await user.click(screen.getByRole('button', { name: 'Padel' }));
    await user.click(screen.getByRole('button', { name: 'Liczba kortów: 2' }));
    await user.click(screen.getByRole('button', { name: 'Czas gry: 2 h' }));
    await user.click(group('Własna rakietka').getByRole('button', { name: 'Ala' }));
    await user.click(screen.getByRole('button', { name: 'Liczba wypożyczonych rakiet: 2' }));
    await typeInto(user, screen.getByLabelText('Cena / szt.:'), '7');
    await typeInto(user, screen.getByLabelText('Cena kortu z rezerwacji (zł)'), '120');
    expect(serializeBody()).toMatchSnapshot();
  });

  it('ostrzeżenia: duplikat daty i sportu oraz przekroczony limit odbić', () => {
    // Skład i sport z ostatniej sesji: ping-pong dziś, 4 karty na 1 stół (limit 2/h).
    renderAdmin({
      playerNames: ['Ala', 'Bartek', 'Cezary', 'Dorota', 'Ewa'],
      defaultMultiPlayers: [],
      singleScanPlayers: [],
      history: [{
        ...LAST_SESSION, id: 'h2', datePlayed: '2025-06-15', sport: 'pingpong', courtCount: 1, durationHours: 1,
        presentPlayers: ['Ala', 'Bartek', 'Cezary', 'Dorota', 'Ewa'],
        multisportPlayers: ['Ala', 'Bartek', 'Cezary', 'Dorota'],
      }],
    });
    expect(screen.getByText('⚠ Sesja z tą datą i tym sportem już istnieje')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz sesję' })).toBeDisabled();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('zmiana sportu na taki bez rakiet czyści rakietki i mówi o tym w komunikacie', async () => {
    const { user } = renderAdmin();
    await user.click(screen.getByRole('button', { name: 'Squash' }));
    await user.click(screen.getByRole('button', { name: 'Liczba wypożyczonych rakiet: 3' }));
    await user.click(screen.getByRole('button', { name: 'Ping-Pong' }));
    expect(screen.getByText('Zmieniono sport — wyczyszczono ustawienia rakietek')).toBeInTheDocument();
    expect(screen.queryByText('Wypożyczone rakiety')).not.toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('zapis wysyła do bazy dokładnie to, co pokazał podgląd, i otwiera podsumowanie', async () => {
    const { user, props } = renderAdmin({ history: [LAST_SESSION] });
    await user.click(screen.getByRole('button', { name: 'Liczba wypożyczonych rakiet: 2' }));
    await user.click(group('Własna rakietka').getByRole('button', { name: 'Ala' }));
    await typeInto(user, screen.getByLabelText('Cena kortu z rezerwacji (zł)'), '120,50');
    await user.click(screen.getByRole('button', { name: 'Zapisz sesję' }));

    await waitFor(() => expect(addSession).toHaveBeenCalledTimes(1));
    expect(addSession.mock.calls[0][0]).toMatchSnapshot();

    expect(await screen.findByText('Podsumowanie sesji')).toBeInTheDocument();
    expect(screen.getByText('Sesja zapisana')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'OK' }));
    await waitFor(() => expect(props.setActiveTab).toHaveBeenCalledWith('dashboard'));
  });

  it('błąd z bazy pokazuje komunikat i zostawia wpisane dane', async () => {
    addSession.mockResolvedValue({ success: false, error: 'Baza odrzuciła zapis' });
    const { user } = renderAdmin();
    await typeInto(user, screen.getByLabelText('Cena kortu z rezerwacji (zł)'), '56');
    await user.click(screen.getByRole('button', { name: 'Zapisz sesję' }));

    expect(await screen.findByText('Baza odrzuciła zapis')).toBeInTheDocument();
    expect(screen.queryByText('Podsumowanie sesji')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Cena kortu z rezerwacji (zł)')).toHaveValue('56');
  });

  it('bez ceny kortu przycisk zapisu jest zablokowany i podaje powód', () => {
    renderAdmin();
    const save = screen.getByRole('button', { name: 'Zapisz sesję' });
    expect(save).toBeDisabled();
    expect(screen.getByText('Wpisz cenę kortu z rezerwacji')).toBeInTheDocument();
  });
});
