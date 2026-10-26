import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PodiumCard from '../components/attendance/PodiumCard';

/**
 * Regresja: karta pojedynczego miejsca na podium była tylko divem, więc
 * kliknięcie w #1/#2/#3 nie otwierało już modala gracza. Przy remisie każdy
 * wiersz musi pozostać osobnym przyciskiem.
 */
const player = (name, overrides = {}) => ({
  name,
  attendanceCount: 38,
  eligibleWeeks: 41,
  currentDebt: 0,
  joinDate: null,
  attendancePercentage: 93,
  currentStreak: 0,
  place: 1,
  ...overrides,
});

describe('PodiumCard', () => {
  it('otwiera szczegóły gracza po kliknięciu karty bez remisu', () => {
    const onSelect = vi.fn();
    render(<PodiumCard podiumEntry={{ place: 1, players: [player('Kamil')] }} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Kamil 93% 38\/41 sesji, miejsce 1/ }));

    expect(onSelect).toHaveBeenCalledWith('Kamil');
  });

  it('obsługuje klawiaturę na karcie bez remisu', () => {
    const onSelect = vi.fn();
    render(<PodiumCard podiumEntry={{ place: 2, players: [player('Piotr', { place: 2, attendancePercentage: 88 })] }} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /Piotr/ });
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('Piotr');
  });

  it('przy remisie każde miejsce ma własny, klikalny wiersz', () => {
    const onSelect = vi.fn();
    render(<PodiumCard podiumEntry={{
      place: 3,
      players: [
        player('Marek', { place: 3, attendancePercentage: 88 }),
        player('Tomek', { place: 3, attendancePercentage: 88 }),
      ],
    }} onSelect={onSelect} />);

    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAccessibleName('Marek 38/41 88%, miejsce 3');
    expect(rows[1]).toHaveAccessibleName('Tomek 38/41 88%, miejsce 3');

    fireEvent.click(rows[1]);
    expect(onSelect).toHaveBeenCalledWith('Tomek');
  });
});
