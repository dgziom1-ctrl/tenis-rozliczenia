import { describe, it, expect } from 'vitest';
import { detectSessionHighlights, historyWithAddedSession } from '../utils/celebrations';

function session(id, date, present, sport = 'pingpong') {
  return {
    id,
    datePlayed: date,
    sport,
    totalCost: 60,
    costPerPerson: 20,
    costPerPersonMulti: 5,
    presentPlayers: present,
    multisportPlayers: [],
  };
}

function player(name, attendanceCount, eligibleWeeks = attendanceCount) {
  return { name, attendanceCount, currentDebt: 0, eligibleWeeks, joinDate: null };
}

describe('historyWithAddedSession', () => {
  it('wkłada nową sesję według daty, nie na ślepo na początek', () => {
    const history = [session('b', '2026-03-08', ['Ala']), session('a', '2026-03-01', ['Ala'])];
    const added = session('c', '2026-03-04', ['Ala']);
    expect(historyWithAddedSession(history, added).map(s => s.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('detectSessionHighlights', () => {
  it('oznacza debiut i nie dodaje fałszywego awansu rangi', () => {
    const players = [player('Ala', 0, 0), player('Bob', 10, 10)];
    const history = Array.from({ length: 10 }, (_, i) =>
      session(`h${i}`, `2026-02-${String(i + 1).padStart(2, '0')}`, ['Bob']),
    );
    const added = session('new', '2026-03-01', ['Ala', 'Bob']);
    const hits = detectSessionHighlights(players, history, added);
    expect(hits).toEqual([{ name: 'Ala', kind: 'debut', label: 'Debiut' }]);
  });

  it('wypisuje kamień milowy serii dokładnie w momencie osiągnięcia', () => {
    const players = [player('Ala', 4, 4)];
    const history = [
      session('4', '2026-03-04', ['Ala']),
      session('3', '2026-03-03', ['Ala']),
      session('2', '2026-03-02', ['Ala']),
      session('1', '2026-03-01', ['Ala']),
    ];
    const added = session('5', '2026-03-05', ['Ala']);
    expect(detectSessionHighlights(players, history, added)).toEqual([
      { name: 'Ala', kind: 'streak', label: 'Seria 5' },
    ]);
  });

  it('nie świętuje serii, która nie jest kamieniem milowym', () => {
    const players = [player('Ala', 5, 5)];
    const history = Array.from({ length: 5 }, (_, i) =>
      session(String(i), `2026-03-0${i + 1}`, ['Ala']),
    );
    const added = session('6', '2026-03-06', ['Ala']);
    expect(detectSessionHighlights(players, history, added)).toEqual([]);
  });

  it('świętuje awans rangi, gdy procent przekracza próg', () => {
    // 8/11 ≈ 73% → WETERAN (60). Po sesji 9/12 = 75% → MISTRZ.
    const players = [player('Ala', 8, 11)];
    const history = [
      session('m', '2026-03-11', []),
      session('l', '2026-03-10', []),
      session('k', '2026-03-09', []),
      ...Array.from({ length: 8 }, (_, i) =>
        session(`p${i}`, `2026-03-${String(i + 1).padStart(2, '0')}`, ['Ala']),
      ),
    ];
    const added = session('new', '2026-03-12', ['Ala']);
    const hits = detectSessionHighlights(players, history, added);
    expect(hits.some(h => h.kind === 'rankup' && h.name === 'Ala')).toBe(true);
  });

  it('pomija graczy, których nie było na nowej sesji', () => {
    const players = [player('Ala', 4, 4), player('Bob', 4, 4)];
    const history = Array.from({ length: 4 }, (_, i) =>
      session(String(i), `2026-03-0${i + 1}`, ['Ala', 'Bob']),
    );
    const added = session('5', '2026-03-05', ['Ala']);
    const hits = detectSessionHighlights(players, history, added);
    expect(hits.every(h => h.name === 'Ala')).toBe(true);
    expect(hits.some(h => h.name === 'Bob')).toBe(false);
  });
});
