/**
 * Zakładka Gracze — jedna karta na gracza: Multisport, Medicover albo brak.
 * Test pilnuje spójnego nazewnictwa (jedna sekcja zamiast osobnych list
 * „karta domyślnie” i „Medicover”) i tego, że wybór trafia do bazy jednym zapisem.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setPlayerCard = vi.hoisted(() => vi.fn());

vi.mock('@/lib/firebase', () => ({
  addPlayer: vi.fn(),
  softDeletePlayer: vi.fn(),
  restorePlayer: vi.fn(),
  permanentDeletePlayer: vi.fn(),
  setPlayerCard,
}));

import PlayersTab from '../components/players/PlayersTab';
import { ToastProvider } from '../components/common/Toast';

const players = ['Ala', 'Bolek', 'Celina'].map(name => ({ name, currentDebt: 0 }));

function renderTab(props = {}) {
  return render(
    <ToastProvider>
      <PlayersTab
        players={players}
        deletedPlayers={[]}
        defaultMultiPlayers={['Ala', 'Bolek']}
        singleScanPlayers={['Bolek']}
        playSound={vi.fn()}
        {...props}
      />
    </ToastProvider>,
  );
}

const cardGroup = (name) => screen.getByRole('group', { name: `Karta gracza ${name}` });
const pressed = (name) => within(cardGroup(name)).getAllByRole('button')
  .filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.trim());

describe('PlayersTab — karty graczy', () => {
  beforeEach(() => {
    setPlayerCard.mockReset();
    setPlayerCard.mockResolvedValue({ success: true });
  });

  it('ma jedną sekcję kart, bez osobnych list „karta domyślnie” i „Medicover”', () => {
    renderTab();
    expect(screen.getByText('Karty graczy')).toBeInTheDocument();
    expect(screen.queryByText('Karta domyślnie')).not.toBeInTheDocument();
    expect(screen.queryByText(/Medicover \(1 odbicie\)/)).not.toBeInTheDocument();
  });

  it('pokazuje przy każdym graczu dokładnie jedną kartę: Brak, Multisport albo Medicover', () => {
    renderTab();
    expect(pressed('Ala')).toEqual(['Multisport']);
    expect(pressed('Bolek')).toEqual(['Medicover']);
    expect(pressed('Celina')).toEqual(['Brak']);
    expect(within(cardGroup('Ala')).getAllByRole('button').map(b => b.textContent.trim()))
      .toEqual(['Brak', 'Multisport', 'Medicover']);
  });

  it('Medicover z samego znacznika jednorazowego odbicia też liczy się jako karta', () => {
    renderTab({ defaultMultiPlayers: [], singleScanPlayers: ['Celina'] });
    expect(pressed('Celina')).toEqual(['Medicover']);
  });

  it('wybór karty zapisuje jedną operacją i od razu go pokazuje', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(within(cardGroup('Celina')).getByRole('button', { name: 'Medicover' }));

    expect(setPlayerCard).toHaveBeenCalledTimes(1);
    expect(setPlayerCard).toHaveBeenCalledWith('Celina', 'single');
  });

  it('zmiana Multisport → Brak i kliknięcie już wybranej karty', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(within(cardGroup('Ala')).getByRole('button', { name: 'Multisport' }));
    expect(setPlayerCard).not.toHaveBeenCalled();

    await user.click(within(cardGroup('Ala')).getByRole('button', { name: 'Brak' }));
    expect(setPlayerCard).toHaveBeenCalledWith('Ala', 'none');
  });

  it('po błędzie zapisu wraca do karty z bazy i pokazuje komunikat', async () => {
    const user = userEvent.setup();
    setPlayerCard.mockResolvedValue({ success: false, error: 'Brak połączenia' });
    renderTab();

    await user.click(within(cardGroup('Celina')).getByRole('button', { name: 'Multisport' }));

    expect(await screen.findByText('Brak połączenia')).toBeInTheDocument();
    expect(pressed('Celina')).toEqual(['Brak']);
  });
});
