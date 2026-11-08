import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import WrappedModal from '../components/attendance/WrappedModal';
import { ToastProvider, useToast } from '../components/common/Toast';
import { RankBadge } from '../components/dashboard/RankBadge';
import Leaderboard from '../components/attendance/Leaderboard';
import Podium from '../components/attendance/Podium';
import SeasonSelector from '../components/attendance/SeasonSelector';
import { costError, racketPriceError } from '../utils/costMessages';
import { RANKS } from '../constants';
import { WRAPPED_DEMO_STATS } from './fixtures/wrappedDemoStats';

describe('WrappedModal — klawiatura i czytnik ekranu', () => {
  it('Spacja na „Wstecz” cofa slajd zamiast go przewijać', async () => {
    const user = userEvent.setup();
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => {}} embedded />);

    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Slajd 2 z/);

    const back = screen.getByRole('button', { name: 'Poprzedni slajd' });
    back.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('status')).toHaveTextContent(/Slajd 1 z/);
  });

  it('ma prawdziwy przycisk „Dalej” i region live ze slajdem', () => {
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => {}} embedded />);
    expect(screen.getByRole('button', { name: 'Dalej' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Toast — role i wstrzymanie', () => {
  function Trigger() {
    const { showSuccess, showError } = useToast();
    return (
      <>
        <button onClick={() => showSuccess('Zapisano', 5000)}>ok</button>
        <button onClick={() => showError('Błąd zapisu', 5000)}>err</button>
      </>
    );
  }

  it('sukces jest `status`, błąd jest `alert`', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><Trigger /></ToastProvider>);
    await user.click(screen.getByText('ok'));
    expect(screen.getByText('Zapisano').closest('[role]')).toHaveAttribute('role', 'status');
    await user.click(screen.getByText('err'));
    expect(screen.getByText('Błąd zapisu').closest('[role]')).toHaveAttribute('role', 'alert');
  });

  it('najechanie wstrzymuje znikanie komunikatu', () => {
    vi.useFakeTimers();
    try {
      render(<ToastProvider><Trigger /></ToastProvider>);
      act(() => { screen.getByText('ok').click(); });
      const toast = screen.getByText('Zapisano').closest('[role]');
      act(() => { toast.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
      act(() => { vi.advanceTimersByTime(8000); });
      expect(screen.queryByText('Zapisano')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RankBadge — dymek zamykany z klawiatury', () => {
  it('Escape zamyka dymek z progiem następnej rangi', async () => {
    const user = userEvent.setup();
    const rank = RANKS[RANKS.length - 1];
    render(<RankBadge rank={rank} pct={10} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('SeasonSelector — grupa przycisków', () => {
  it('ma nazwę grupy „Sezon”', () => {
    render(<SeasonSelector seasons={[2025, 2026]} selected={null} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Sezon' })).toBeInTheDocument();
  });
});

describe('Ranking — semantyka', () => {
  const player = (name, place) => ({
    name, place, attendancePercentage: 50, attendanceCount: 5, eligibleWeeks: 10, currentStreak: 0,
  });

  it('pozostali gracze to lista z prawdziwymi przyciskami', () => {
    const ranked = [player('A', 4), player('B', 5)];
    render(<Leaderboard ranked={ranked} podiumPlayers={[]} onSelect={() => {}} />);
    const list = screen.getByRole('list', { name: 'Pozostali gracze w rankingu' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getAllByRole('button')).toHaveLength(2);
  });

  it('podium jest w DOM w kolejności 1., 2., 3., a układ 2-1-3 robi CSS order', () => {
    const entries = [1, 2, 3].map(place => ({ place, players: [player(`P${place}`, place)] }));
    const { container } = render(<Podium podiumPlayers={entries} onSelect={() => {}} />);
    const columns = [...container.querySelectorAll('[data-podium-place]')];
    expect(columns.map(c => c.getAttribute('data-podium-place'))).toEqual(['1', '2', '3']);
    expect(columns.map(c => c.style.order)).toEqual(['1', '0', '2']);
  });
});

describe('komunikaty kwot', () => {
  it('rozróżnia puste, nienumeryczne i ujemne koszty', () => {
    expect(costError('')).toBe('Wpisz koszt kortu');
    expect(costError('abc')).toMatch(/cyframi/);
    expect(costError('-3')).toBe('Koszt nie może być ujemny');
    expect(costError('41,50')).toBeNull();
  });

  it('cena rakietki nie zamienia błędnego tekstu po cichu w 0 zł', () => {
    expect(racketPriceError('')).toBe('Wpisz cenę rakietki');
    expect(racketPriceError('abc')).toMatch(/cyframi/);
    expect(racketPriceError('-1')).toBe('Cena nie może być ujemna');
    expect(racketPriceError('5')).toBeNull();
  });
});
