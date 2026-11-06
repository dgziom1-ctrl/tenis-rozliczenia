import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttendanceGrid from '../components/attendance/AttendanceGrid';
import { buildAttendanceGrid } from '../utils/attendanceGrid';

const session = (id, datePlayed, presentPlayers) => ({
  id, datePlayed, totalCost: 100, sport: 'pingpong', costPerPerson: 10,
  costPerPersonMulti: 10, presentPlayers, multisportPlayers: [],
});

// 2026-03-02 to poniedziałek, 2026-03-09 kolejny.
const history = [
  session('1', '2026-03-02', ['Ala']),
  session('2', '2026-03-09', ['Bartek']),
];

describe('AttendanceGrid', () => {
  it('układa okno 20 tygodni × 7 dni kończące się tygodniem ostatniej sesji', () => {
    const cells = buildAttendanceGrid(history, 'Ala', 20);
    expect(cells).toHaveLength(140);
    const present = cells.filter(c => c.state === 'present');
    const missed = cells.filter(c => c.state === 'missed');
    expect(present.map(c => c.date)).toEqual(['2026-03-02']);
    expect(missed.map(c => c.date)).toEqual(['2026-03-09']);
    // poniedziałek = wiersz 0, ostatnia kolumna to tydzień 03-09
    expect(missed[0]).toMatchObject({ col: 19, row: 0 });
    expect(present[0].latest).toBe(true);
  });

  it('zwraca pustą siatkę bez historii i nic nie renderuje', () => {
    expect(buildAttendanceGrid([], 'Ala')).toEqual([]);
    const { container } = render(
      <AttendanceGrid history={[]} playerName="Ala" color={{ border: '#0ff' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opisuje frekwencję czytnikom ekranu', () => {
    render(<AttendanceGrid history={history} playerName="Ala" color={{ border: '#0ff' }} />);
    expect(screen.getByRole('img', { name: /obecny 1 razy, nieobecny 1 razy/ })).toBeInTheDocument();
  });
});
