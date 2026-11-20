// Charakteryzacja karty gracza (PlayerCard): stany salda, przepływ wpłaty,
// ponowienie po błędzie (to samo id wpłaty — inaczej wpłata policzyłaby się
// dwa razy), cofnięcie i tryb edycji wpłat. Ruch jest wyłączony, więc licznik
// kwoty od razu pokazuje wartość docelową. Chroni wydzielanie hooków z komponentu.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { serializeBody, stubMedia } from './fixtures/domSnapshot';
import PlayerCard from '../components/dashboard/PlayerCard';
import { buildPlayerCardMeta } from '../utils/playerCard';
import { createPlayerColorMap } from '../constants/colors';
import { ORGANIZER_NAME } from '../constants';

const HISTORY = [
  { id: 's3', datePlayed: '2025-03-12', sport: 'squash', totalCost: 80, costPerPerson: 20, costPerPersonMulti: 5, presentPlayers: ['Ala', 'Bartek'], multisportPlayers: [] },
  { id: 's2', datePlayed: '2025-03-05', sport: 'pingpong', totalCost: 60, costPerPerson: 30, costPerPersonMulti: 15, presentPlayers: ['Ala'], multisportPlayers: [] },
  { id: 's1', datePlayed: '2025-02-26', sport: 'pingpong', totalCost: 60, costPerPerson: 20, costPerPersonMulti: 5, presentPlayers: ['Bartek'], multisportPlayers: [] },
];

const BREAKDOWN = {
  sessions: [
    { sessionId: 's3', date: '2025-03-12', amount: 20 },
    { sessionId: 's2', date: '2025-03-05', amount: 30 },
  ],
  payments: [{ id: 'pay-old', amount: 5, date: '2025-03-06' }],
  carryOver: null,
  totalSessions: 50,
  totalPaid: 5,
  balance: 45,
};

const OTHERS = [
  { name: 'Ala', currentDebt: 45, attendanceCount: 2, eligibleWeeks: 3, joinDate: null },
  { name: 'Bartek', currentDebt: -10, attendanceCount: 2, eligibleWeeks: 3, joinDate: null },
  { name: 'Cezary', currentDebt: 0, attendanceCount: 1, eligibleWeeks: 3, joinDate: null },
];

function renderCard({ name = 'Ala', debt = 45, ...overrides } = {}) {
  const player = {
    name, currentDebt: debt, joinDate: null, attendanceCount: 2, eligibleWeeks: 3,
    attendancePercentage: 67, currentStreak: 2,
  };
  const props = {
    player,
    playerColor: createPlayerColorMap([name]).get(name),
    history: HISTORY,
    meta: buildPlayerCardMeta(player, HISTORY),
    openDetails: false,
    onToggleDetails: vi.fn(),
    breakdown: null,
    onAddPayment: vi.fn().mockResolvedValue({ success: true, paymentId: 'pay-1' }),
    onRemovePayment: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
  const user = userEvent.setup();
  const view = render(<PlayerCard {...props} />);
  return { user, props, ...view };
}

describe('PlayerCard — charakteryzacja', () => {
  beforeEach(() => stubMedia({ reducedMotion: true }));
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    ['zaległość', { debt: 45 }],
    ['nadpłata', { debt: -20 }],
    ['rozliczony', { debt: 0 }],
    ['zaległość z rozwiniętym rozbiciem', { debt: 45, openDetails: true, breakdown: BREAKDOWN }],
    ['skarbnik: do zebrania', { name: ORGANIZER_NAME, debt: -77.5, allPlayers: OTHERS }],
    ['skarbnik: saldo dodatnie', { name: ORGANIZER_NAME, debt: 10, allPlayers: OTHERS }],
    ['skarbnik: wszyscy rozliczeni', { name: ORGANIZER_NAME, debt: 0, allPlayers: OTHERS, openDetails: true }],
  ])('stan: %s', (_label, overrides) => {
    renderCard(overrides);
    expect(serializeBody()).toMatchSnapshot();
  });

  it('wersja mobilna: bez kodu kreskowego, z mniejszą liczbą kropek sesji', () => {
    stubMedia({ mobile: true, reducedMotion: true });
    renderCard({ debt: 45 });
    expect(serializeBody()).toMatchSnapshot();
  });

  it('wpłata dowolnej kwoty: okno, zapis z id, pasek cofnięcia i cofnięcie', async () => {
    const { user, props } = renderCard({ debt: 45 });
    await user.click(screen.getByRole('button', { name: '+ Inna kwota' }));
    const input = await screen.findByLabelText('Kwota w złotych');
    await user.type(input, '12,5');
    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));

    await waitFor(() => expect(props.onAddPayment).toHaveBeenCalledTimes(1));
    const [name, amount, paymentId] = props.onAddPayment.mock.calls[0];
    expect([name, amount]).toEqual(['Ala', 12.5]);
    expect(typeof paymentId).toBe('string');
    expect(paymentId.length).toBeGreaterThan(0);

    expect(await screen.findByText('12,50 zł zapisane')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cofnij/ }));
    await waitFor(() => expect(props.onRemovePayment).toHaveBeenCalledWith('Ala', 'pay-1'));
    await waitFor(() => expect(screen.queryByText('12,50 zł zapisane')).not.toBeInTheDocument());
  });

  it('nieudany zapis pokazuje błąd, a ponowienie używa TEGO SAMEGO id wpłaty', async () => {
    const onAddPayment = vi.fn()
      .mockResolvedValueOnce({ success: false, error: 'Baza odrzuciła zapis' })
      .mockResolvedValueOnce({ success: true, paymentId: 'pay-2' });
    const { user } = renderCard({ debt: 45, onAddPayment });

    await user.click(screen.getByRole('button', { name: '+ Inna kwota' }));
    await user.type(await screen.findByLabelText('Kwota w złotych'), '20');
    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));
    expect(await screen.findByText('⚠ Baza odrzuciła zapis')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));
    await waitFor(() => expect(onAddPayment).toHaveBeenCalledTimes(2));
    expect(onAddPayment.mock.calls[1][2]).toBe(onAddPayment.mock.calls[0][2]);
    expect(onAddPayment.mock.calls[1][1]).toBe(20);
  });

  it('wyjątek z zapisu też pokazuje komunikat i nie blokuje ponowienia', async () => {
    const onAddPayment = vi.fn()
      .mockRejectedValueOnce(new Error('Sieć padła'))
      .mockResolvedValueOnce({ success: true, paymentId: 'pay-3' });
    const { user } = renderCard({ debt: 45, onAddPayment });
    await user.click(screen.getByRole('button', { name: '+ Inna kwota' }));
    await user.type(await screen.findByLabelText('Kwota w złotych'), '5');
    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));
    expect(await screen.findByText('⚠ Sieć padła')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));
    await waitFor(() => expect(onAddPayment).toHaveBeenCalledTimes(2));
  });

  it('anulowanie okna czyści błąd, kwotę i oczekujące id wpłaty', async () => {
    const onAddPayment = vi.fn()
      .mockResolvedValueOnce({ success: false, error: 'Błąd' })
      .mockResolvedValueOnce({ success: true, paymentId: 'pay-4' });
    const { user } = renderCard({ debt: 45, onAddPayment });
    await user.click(screen.getByRole('button', { name: '+ Inna kwota' }));
    await user.type(await screen.findByLabelText('Kwota w złotych'), '7');
    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));
    await screen.findByText('⚠ Błąd');
    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    await waitFor(() => expect(screen.queryByLabelText('Kwota w złotych')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: '+ Inna kwota' }));
    expect(await screen.findByLabelText('Kwota w złotych')).toHaveValue('');
    await user.type(screen.getByLabelText('Kwota w złotych'), '7');
    await user.click(screen.getByRole('button', { name: 'Zapisz wpłatę' }));
    await waitFor(() => expect(onAddPayment).toHaveBeenCalledTimes(2));
    // Po anulowaniu wpłata jest nową operacją, więc dostaje nowe id.
    expect(onAddPayment.mock.calls[1][2]).not.toBe(onAddPayment.mock.calls[0][2]);
  });

  it('zapis całego długu z klawiatury: potwierdzenie, a potem wpłata dokładnie na kwotę salda', async () => {
    const { user, props } = renderCard({ debt: 45 });
    const settle = screen.getByRole('button', { name: /45,00 zł — zapisz wpłatę/ });
    settle.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Zapisać wpłatę?')).toBeInTheDocument();
    expect(screen.getByText(/jako wpłatę od Ala/)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Tak, zapisz' }));
    await waitFor(() => expect(props.onAddPayment).toHaveBeenCalledTimes(1));
    expect(props.onAddPayment.mock.calls[0].slice(0, 2)).toEqual(['Ala', 45]);
  });

  it('przytrzymanie 0,8 s zapisuje cały dług, krótkie dotknięcie nie', async () => {
    vi.useFakeTimers();
    const { props } = renderCard({ debt: 45 });
    const button = screen.getByRole('button', { name: /45,00 zł — zapisz wpłatę/ });
    const pointer = type => new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 5, clientY: 5 });

    fireEvent(button, pointer('pointerdown'));
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent(button, pointer('pointerup'));
    expect(props.onAddPayment).not.toHaveBeenCalled();

    fireEvent(button, pointer('pointerdown'));
    act(() => { vi.advanceTimersByTime(820); });
    fireEvent(button, pointer('pointerup'));
    expect(props.onAddPayment).toHaveBeenCalledTimes(1);
    expect(props.onAddPayment.mock.calls[0].slice(0, 2)).toEqual(['Ala', 45]);
    await act(async () => { await Promise.resolve(); });
  });

  it('tryb edycji wpłat: pięć kliknięć w kwotę, Enter i widoczny przycisk przełączają go', async () => {
    const { user } = renderCard({ debt: 45, openDetails: true, breakdown: BREAKDOWN });
    const amount = screen.getByRole('button', { name: /45,00zł.*tryb edycji wpłat/ });
    expect(amount).toHaveAttribute('aria-pressed', 'false');

    for (let i = 0; i < 4; i += 1) await user.click(amount);
    expect(amount).toHaveAttribute('aria-pressed', 'false');
    await user.click(amount);
    expect(amount).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Tryb edycji')).toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();

    await user.click(screen.getByRole('button', { name: 'Zakończ edycję wpłat' }));
    expect(amount).toHaveAttribute('aria-pressed', 'false');
    amount.focus();
    await user.keyboard('{Enter}');
    expect(amount).toHaveAttribute('aria-pressed', 'true');
  });

  it('kliknięcia rozłożone w czasie nie włączają trybu edycji', async () => {
    vi.useFakeTimers();
    renderCard({ debt: 45 });
    const amount = screen.getByRole('button', { name: /45,00zł.*tryb edycji wpłat/ });
    for (let i = 0; i < 4; i += 1) fireEvent.click(amount);
    act(() => { vi.advanceTimersByTime(1100); });
    fireEvent.click(amount);
    expect(amount).toHaveAttribute('aria-pressed', 'false');
  });

  it('przycisk szczegółów woła onToggleDetails z imieniem gracza', async () => {
    const { user, props } = renderCard({ debt: 45, breakdown: BREAKDOWN });
    await user.click(screen.getByRole('button', { name: /Skąd ta kwota/ }));
    expect(props.onToggleDetails).toHaveBeenCalledWith('Ala');
  });
});
