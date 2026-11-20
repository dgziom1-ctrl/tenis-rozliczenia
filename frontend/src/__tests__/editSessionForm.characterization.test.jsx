// Charakteryzacja formularza edycji sesji (EditSessionForm).
//
// Formularz jest sterowany z zewnątrz (HistoryTab), więc test używa małej
// powłoki ze stanem, która liczy poprawność kosztu i przełącza graczy tak samo
// jak HistoryTab. Snapshoty są zapisem DOM sprzed refaktoru (patrz
// `fixtures/domSnapshot.js`); chronią wydzielanie wspólnych części formularzy.

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { serializeBody, stubMedia } from './fixtures/domSnapshot';
import EditSessionForm from '../components/history/EditSessionForm';
import { parseAmount, isValidAmount } from '../utils/format';
import { costError } from '../utils/costMessages';
import { grossError, resolveEditRefund } from '../utils/courtRefund';

const NAMES = ['Ala', 'Bartek', 'Cezary', 'Dorota'];

/** Powłoka odtwarza to, co HistoryTab robi wokół formularza. */
function Harness({ initial, singleScanPlayers = [], isSaving = false, handlers }) {
  const [editForm, setEditForm] = useState(initial);
  const refund = resolveEditRefund(editForm);
  const parsed = refund ? (refund.net ?? 0) : parseAmount(editForm.cost);
  const isEditCostValid = refund ? refund.net !== null : isValidAmount(parsed, 0);
  const editCostError = isEditCostValid
    ? null
    : refund ? (grossError(editForm.courtGross) ?? refund.error) : costError(String(editForm.cost));

  const togglePresent = (name) => setEditForm((prev) => {
    const inList = (prev.present || []).includes(name);
    return {
      ...prev,
      present: inList ? prev.present.filter(p => p !== name) : [...prev.present, name],
      multiPlayers: inList ? (prev.multiPlayers || []).filter(p => p !== name) : prev.multiPlayers,
      ownRacketPlayers: inList ? (prev.ownRacketPlayers || []).filter(p => p !== name) : prev.ownRacketPlayers,
    };
  });
  const toggleMulti = (name) => setEditForm((prev) => {
    const inList = (prev.multiPlayers || []).includes(name);
    const single = prev.singleScanPlayers ?? [];
    const nextSingle = inList
      ? single.filter(p => p !== name)
      : singleScanPlayers.includes(name) && !single.includes(name) ? [...single, name] : single;
    return {
      ...prev,
      multiPlayers: inList ? prev.multiPlayers.filter(p => p !== name) : [...prev.multiPlayers, name],
      singleScanPlayers: nextSingle,
    };
  });

  return (
    <EditSessionForm
      editForm={editForm}
      setEditForm={setEditForm}
      playerNames={NAMES}
      isSaving={isSaving}
      isEditCostValid={isEditCostValid}
      editCostError={editCostError}
      onSave={() => handlers.onSave(editForm)}
      onCancel={handlers.onCancel}
      onTogglePresent={togglePresent}
      onToggleMulti={toggleMulti}
    />
  );
}

/** Sesja sprzed nowej zasady: bez kortów, godzin i ceny przed zwrotem. */
const LEGACY_PINGPONG = {
  date: '2025-02-05', cost: 45, present: ['Ala', 'Bartek', 'Cezary'], multiPlayers: ['Bartek'],
  sport: 'pingpong', racketCount: 0, racketPrice: 5, ownRacketPlayers: [], singleScanPlayers: [],
};

const LEGACY_SQUASH = {
  ...LEGACY_PINGPONG, sport: 'squash', cost: 60, present: ['Ala', 'Bartek', 'Cezary', 'Dorota'],
  racketCount: 2, racketPrice: 5, ownRacketPlayers: ['Ala'],
};

/** Nowa zasada: cena przed zwrotem z ręcznie poprawionym zwrotem, 2 korty na 2 h, Medicover. */
const PER_SCAN = {
  date: '2025-03-12', cost: 80, present: ['Ala', 'Bartek', 'Cezary', 'Dorota'], multiPlayers: ['Bartek', 'Cezary'],
  sport: 'badminton', racketCount: 0, racketPrice: 5, ownRacketPlayers: [], singleScanPlayers: ['Cezary'],
  courtCount: 2, durationHours: 2, discountModel: 'perScan', courtGross: 120, refundOverride: 25,
};

function setup(initial, extra = {}) {
  const handlers = { onSave: vi.fn(), onCancel: vi.fn() };
  const user = userEvent.setup();
  render(<Harness initial={initial} handlers={handlers} {...extra} />);
  return { user, handlers };
}

// Etykieta bywa też w podglądzie podziału („Własna rakietka”), więc bierzemy tę nad siatką graczy.
const section = (label) => {
  const heading = screen.getAllByText(label).find(node => node.closest('div')?.querySelector('.player-grid'));
  return within(heading.closest('div'));
};
const column = label => within(screen.getByText(label).parentElement);

describe('EditSessionForm — charakteryzacja', () => {
  beforeEach(() => stubMedia());

  it('stara sesja ping-pong: jedno pole kosztu kortu, bez limitu odbić', () => {
    setup(LEGACY_PINGPONG);
    expect(serializeBody()).toMatchSnapshot();
  });

  it('stara sesja squash z rakietami: wypożyczenie, własna rakietka i podział wg dawnej zasady', () => {
    setup(LEGACY_SQUASH);
    expect(serializeBody()).toMatchSnapshot();
  });

  it('sesja z nową zasadą: cena przed zwrotem, ręczny zwrot, Medicover, limit na godzinę', () => {
    setup(PER_SCAN);
    expect(serializeBody()).toMatchSnapshot();
  });

  it('wybór kortu w starej sesji włącza też domyślną godzinę, a godzin — domyślny kort', async () => {
    const { user } = setup(LEGACY_PINGPONG);
    await user.click(column('Korty / stoły').getByRole('button', { name: '2' }));
    expect(serializeBody()).toMatchSnapshot();
    await user.click(column('Godziny').getByRole('button', { name: '3h' }));
    expect(column('Godziny').getByRole('button', { name: '3h' })).toHaveAttribute('aria-pressed', 'true');
    expect(column('Korty / stoły').getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cena rakiety: edycja tekstu, błąd dla złej wartości, przycisk przywracający cenę domyślną', async () => {
    const { user } = setup(LEGACY_SQUASH);
    const price = screen.getByLabelText('Cena / szt.:');
    await user.clear(price);
    await user.type(price, '7,5');
    expect(screen.getByRole('button', { name: 'Przywróć 5 zł' })).toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();

    await user.clear(price);
    await user.type(price, 'abc');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Przywróć 5 zł' }));
    expect(price).toHaveValue('5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('liczba rakiet i własna rakietka zmieniają koszt i opis', async () => {
    const { user } = setup(LEGACY_SQUASH);
    await user.click(screen.getByRole('button', { name: 'Liczba wypożyczonych rakiet: 3' }));
    await user.click(section('Własna rakietka').getByRole('button', { name: 'Bartek' }));
    expect(serializeBody()).toMatchSnapshot();
  });

  it('zmiana sportu na ping-pong zeruje rakiety, a na padel zachowuje stan wypożyczenia', async () => {
    const { user } = setup(LEGACY_SQUASH);
    await user.click(screen.getByRole('button', { name: 'Ping-Pong' }));
    expect(screen.queryByText('Wypożyczone rakiety')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Padel' }));
    expect(screen.getByRole('button', { name: 'Liczba wypożyczonych rakiet: 0' })).toHaveAttribute('aria-pressed', 'true');
    expect(serializeBody()).toMatchSnapshot();
  });

  it('odznaczenie gracza zdejmuje go też z kart i własnych rakiet', async () => {
    const { user } = setup(LEGACY_SQUASH);
    await user.click(section('Obecni').getByRole('button', { name: 'Ala' }));
    expect(section('Obecni').getByRole('button', { name: 'Ala' })).toHaveAttribute('aria-pressed', 'false');
    expect(section('Własna rakietka').queryByRole('button', { name: 'Ala' })).not.toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('karta dodana przy edycji dostaje cechę Medicover gracza (nowa zasada)', async () => {
    const { user } = setup(PER_SCAN, { singleScanPlayers: ['Dorota'] });
    await user.click(section('Kto miał kartę?').getByRole('button', { name: 'Dorota' }));
    expect(section('Kto miał kartę?').getByRole('button', { name: 'Dorota (Medicover)' })).toBeInTheDocument();
  });

  it('bez graczy zapis jest zablokowany i pojawia się ostrzeżenie', async () => {
    const { user } = setup({ ...LEGACY_PINGPONG, present: ['Ala'], multiPlayers: [] });
    await user.click(section('Obecni').getByRole('button', { name: 'Ala' }));
    expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeDisabled();
    expect(screen.getByText('⚠ Wybierz przynajmniej jednego gracza')).toBeInTheDocument();
  });

  it('zapis i anulowanie wołają handlery z aktualnym stanem formularza', async () => {
    const { user, handlers } = setup(LEGACY_PINGPONG);
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(handlers.onSave).toHaveBeenCalledTimes(1);
    expect(handlers.onSave.mock.calls[0][0]).toMatchSnapshot();
    await user.click(screen.getByRole('button', { name: 'Anuluj edycję' }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });

  it('stan zapisu blokuje przyciski', () => {
    setup(LEGACY_PINGPONG, { isSaving: true });
    expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anuluj edycję' })).toBeDisabled();
  });
});
