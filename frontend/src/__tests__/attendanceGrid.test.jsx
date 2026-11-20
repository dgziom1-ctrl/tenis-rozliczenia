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
  it('daje jedno pole na tydzień, rzędami po 13, kończąc na tygodniu ostatniej sesji', () => {
    const cells = buildAttendanceGrid(history, 'Ala', 26, 13);
    expect(cells).toHaveLength(26);
    const present = cells.filter(c => c.state === 'present');
    const missed = cells.filter(c => c.state === 'missed');
    expect(present.map(c => c.date)).toEqual(['2026-03-02']);
    expect(missed.map(c => c.date)).toEqual(['2026-03-09']);
    // ostatni tydzień (03-09) to ostatnie pole: 2. rząd, 13. kolumna
    expect(missed[0]).toMatchObject({ col: 12, row: 1 });
    expect(present[0].latest).toBe(true);
    // tygodnie bez grania to 'none', nie nieobecność
    expect(cells.filter(c => c.state === 'none')).toHaveLength(24);
  });

  it('dwie sesje w jednym tygodniu to jedno pole', () => {
    const two = [session('1', '2026-03-02', ['Bartek']), session('2', '2026-03-04', ['Ala'])];
    const cells = buildAttendanceGrid(two, 'Ala', 26, 13);
    expect(cells.filter(c => c.state !== 'none')).toHaveLength(1);
    expect(cells.find(c => c.state !== 'none').state).toBe('present');
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
