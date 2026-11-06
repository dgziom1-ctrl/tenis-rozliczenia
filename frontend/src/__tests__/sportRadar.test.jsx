import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SportRadar from '../components/attendance/SportRadar';
import { buildSportProfile } from '../utils/sportProfile';

const session = (id, sport, presentPlayers) => ({
  id, datePlayed: `2026-03-${String(id).padStart(2, '0')}`, totalCost: 100, sport,
  costPerPerson: 10, costPerPersonMulti: 10, presentPlayers, multisportPlayers: [],
});
const color = { border: '#0ff' };

const history = [
  session(1, 'pingpong', ['Ala', 'Bartek']),
  session(2, 'pingpong', ['Ala']),
  session(3, 'squash', ['Ala', 'Bartek']),
  session(4, 'padel', ['Bartek']),
];

describe('profil sportowy', () => {
  it('liczy sesje gracza i udział grupy per sport', () => {
    const p = buildSportProfile(history, 'Ala');
    expect(p.counts).toEqual({ pingpong: 2, squash: 1, badminton: 0, padel: 0 });
    expect(p.total).toBe(3);
    expect(p.playerShare.pingpong).toBeCloseTo(2 / 3);
    // obecności grupy: pingpong 3, squash 2, padel 1
    expect(p.groupShare.pingpong).toBeCloseTo(3 / 6);
    expect(p.groupShare.padel).toBeCloseTo(1 / 6);
  });

  it('rysuje radar z opisem dla czytników ekranu', () => {
    render(<SportRadar history={history} playerName="Ala" color={color} />);
    expect(screen.getByRole('img', { name: /Ping-Pong 2, Squash 1, Badminton 0, Padel 0/ })).toBeInTheDocument();
  });

  it('przy dokładnie 3 sesjach rysuje już wykres', () => {
    // Bartek: pingpong 1, squash 1, padel 1.
    render(<SportRadar history={history} playerName="Bartek" color={color} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('nowy gracz z 2 sesjami dostaje komunikat, bez sesji nic', () => {
    const two = history.slice(0, 2);
    render(<SportRadar history={two} playerName="Ala" color={color} />);
    expect(screen.getByText(/Za mało sesji/)).toBeInTheDocument();
    const { container } = render(<SportRadar history={history} playerName="Nikt" color={color} />);
    expect(container).toBeEmptyDOMElement();
  });
});
