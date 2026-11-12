import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RankingReplay from '../components/attendance/RankingReplay';
import { computeWeeklyRankingHistory, weekStartOf } from '../utils/rankings';

/**
 * Replay pokazuje tygodniowe klatki z computeWeeklyRankingHistory i płynnie
 * przechodzi między nimi. Test pilnuje, że remis (dwa razy #1) nie nakłada
 * wierszy na siebie, że suwak zmienia tydzień i że replay startuje rozwinięty.
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
  session('2', '2026-01-17', ['Ala']),
];

describe('weekly ranking history', () => {
  it('liczy poniedziałek tygodnia', () => {
    expect(weekStartOf('2026-01-10')).toBe('2026-01-05'); // sobota
    expect(weekStartOf('2026-01-05')).toBe('2026-01-05'); // poniedziałek
    expect(weekStartOf('2026-01-11')).toBe('2026-01-05'); // niedziela
  });

  it('daje jedną klatkę na tydzień, a dwie sesje w tygodniu łączy', () => {
    const frames = computeWeeklyRankingHistory(players, [
      ...history, session('3', '2026-01-15', ['Bartek']),
    ]);
    expect(frames.map(f => f.date)).toEqual(['2026-01-10', '2026-01-17']);
  });
});

describe('RankingReplay', () => {
  it('nie renderuje nic przy jednym tygodniu danych', () => {
    const { container } = render(<RankingReplay players={players} history={[history[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('jest domyślnie rozwinięty, rozkłada remis i zmienia klatkę suwakiem', () => {
    render(<RankingReplay players={players} history={history} />);
    expect(screen.getByRole('button', { name: /Zwiń replay/ })).toHaveAttribute('aria-expanded', 'true');

    // Klatka 1: obaj 100%, oba wiersze mają różne przesunięcie w pionie.
    fireEvent.change(screen.getByLabelText('Tydzień replay'), { target: { value: '0' } });
    expect(screen.getByText(/10 sty/)).toBeInTheDocument();
    const rows = document.querySelectorAll('.replay-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].style.transform).not.toBe(rows[1].style.transform);

    fireEvent.change(screen.getByLabelText('Tydzień replay'), { target: { value: '1' } });
    expect(screen.getByText(/17 sty/)).toBeInTheDocument();
    expect(screen.getByText('lider: Ala')).toBeInTheDocument();
  });
});
