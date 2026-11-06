import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RankingReplay from '../components/attendance/RankingReplay';

/**
 * Replay tylko pokazuje klatki z computeRankingHistory. Test pilnuje, że
 * remis (dwa razy #1) nie nakłada wierszy na siebie i że suwak zmienia miesiąc.
 */
const player = name => ({
  name, attendanceCount: 0, eligibleWeeks: 0, currentDebt: 0, joinDate: null,
  attendancePercentage: 0, currentStreak: 0, place: 1,
});
const session = (id, datePlayed, presentPlayers) => ({
  id, datePlayed, totalCost: 100, sport: 'pingpong', costPerPerson: 10,
  costPerPersonMulti: 10, presentPlayers, multisportPlayers: [],
});

const players = [player('Ala'), player('Bartek')];
const history = [
  session('1', '2026-01-10', ['Ala', 'Bartek']),
  session('2', '2026-02-10', ['Ala']),
];

describe('RankingReplay', () => {
  it('nie renderuje nic przy jednym miesiącu danych', () => {
    const { container } = render(<RankingReplay players={players} history={[history[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('rozkłada remis na osobne pozycje i zmienia klatkę suwakiem', () => {
    render(<RankingReplay players={players} history={history} />);
    fireEvent.click(screen.getByRole('button', { name: /Pokaż replay/ }));

    // Klatka 1: obaj 100%, oba wiersze mają różne przesunięcie w pionie.
    expect(screen.getByText('01/2026')).toBeInTheDocument();
    const rows = document.querySelectorAll('.replay-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].style.transform).not.toBe(rows[1].style.transform);

    fireEvent.change(screen.getByLabelText('Miesiąc replay'), { target: { value: '1' } });
    expect(screen.getByText('02/2026')).toBeInTheDocument();
    expect(screen.getByText('lider: Ala')).toBeInTheDocument();
  });
});
