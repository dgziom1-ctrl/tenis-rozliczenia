import { render, screen } from '@testing-library/react';
import AttendanceTrendChart from '../components/history/AttendanceTrendChart';
import { spacedLabelIndices } from '../utils/chart';

/** Minimalny kształt, którego potrzebuje wykres — reszta pól historii nie ma znaczenia. */
function session(datePlayed, players) {
  return {
    id: datePlayed,
    datePlayed,
    presentPlayers: Array.from({ length: players }, (_, i) => `Gracz ${i + 1}`),
    costPerPerson: 10,
  };
}

describe('AttendanceTrendChart — zakres statystyk', () => {
  it('liczy maksimum i liczbę sesji z całej historii, nie z ostatnich 12', () => {
    const history = [
      // Tabela dostaje historię od najnowszej sesji.
      ...Array.from({ length: 12 }, (_, i) =>
        session(`2026-10-${String(21 - i).padStart(2, '0')}`, 4)),
      session('2026-05-13', 6),
    ];

    render(<AttendanceTrendChart history={history} />);

    const maxValue = screen.getByText('Max sesja').previousElementSibling;
    expect(maxValue).toHaveTextContent('6 os.');

    const sessionsValue = screen.getByText('Sesji').previousElementSibling;
    expect(sessionsValue).toHaveTextContent('13');
  });

  it('sortuje punkty po dacie niezależnie od kolejności wejścia', () => {
    const history = [
      session('2026-10-21', 5),
      session('2026-05-13', 6),
      session('2026-07-01', 4),
    ];

    const { container } = render(<AttendanceTrendChart history={history} />);
    const dateLabels = [...container.querySelectorAll('text')]
      .map(node => node.textContent)
      .filter(text => / paź| lip| maj/.test(text ?? ''));

    expect(dateLabels).toEqual(['13 maj', '1 lip', '21 paź']);
  });
});

describe('spacedLabelIndices — odstępy podpisów osi', () => {
  it('nie dokłada ostatniego podpisu obok przedostatniego', () => {
    // 22 sesje w 278 px: krok 6 daje 0, 6, 12, a ostatni punkt (21) jest
    // o trzy sesje dalej — mieści się i zostaje dołożony.
    expect(spacedLabelIndices(22, 278, 58)).toEqual([0, 6, 12, 21]);
  });

  it('zastępuje poprzedni podpis, gdy ostatni wypada za blisko', () => {
    // 19 sesji w 278 px: krok 5 daje 0, 5, 10, 15, a 18 jest o trzy sesje od 15
    // (46 px) — za blisko. Zamiast dwóch nachodzących podpisów zostaje 15 → 18.
    expect(spacedLabelIndices(19, 278, 58)).toEqual([0, 5, 10, 18]);
  });

  it('zachowuje minimalny odstęp dla każdej liczby sesji i szerokości', () => {
    for (const width of [278, 400, 760, 1114]) {
      for (let count = 2; count <= 60; count++) {
        const indices = spacedLabelIndices(count, width, 58);
        const gap = width / (count - 1);
        for (let i = 1; i < indices.length; i++) {
          expect((indices[i] - indices[i - 1]) * gap).toBeGreaterThanOrEqual(58);
        }
        expect(indices.at(-1)).toBe(count - 1);
      }
    }
  });

  it('radzi sobie z zerem i jedną sesją', () => {
    expect(spacedLabelIndices(0, 278)).toEqual([]);
    expect(spacedLabelIndices(1, 278)).toEqual([0]);
  });
});
