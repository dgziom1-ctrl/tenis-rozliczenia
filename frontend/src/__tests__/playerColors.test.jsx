import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PlayerProfileCard from '../components/players/PlayerProfileCard';
import { createPlayerColorMap } from '../constants/colors';

const roster = ['Kamil', 'Krzysiek', 'Rafał', 'Przemek', 'Mariusz', 'Arek', 'Gosia', 'Ala'];
const playerColors = createPlayerColorMap(roster);
const toCssRgb = hex => `rgb(${hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16)).join(', ')})`;

describe('kolory profili graczy', () => {
  it('przypisuje unikalne kolory całemu składowi niezależnie od kolejności listy', () => {
    expect(new Set(roster.map(name => playerColors.get(name).border)).size).toBe(roster.length);

    const reversedColors = createPlayerColorMap([...roster].reverse());
    roster.forEach(name => {
      expect(reversedColors.get(name)).toEqual(playerColors.get(name));
    });
  });

  it('rysuje Kamilowi i Krzyśkowi różne ramki zgodne z kolorami profili', () => {
    const { container } = render(
      <>
        <PlayerProfileCard
          player={{ name: 'Kamil' }}
          playerColor={playerColors.get('Kamil')}
          onDelete={vi.fn()}
          isOrganizer
        />
        <PlayerProfileCard
          player={{ name: 'Krzysiek' }}
          playerColor={playerColors.get('Krzysiek')}
          onDelete={vi.fn()}
          isOrganizer={false}
        />
      </>,
    );
    const [kamilCard, krzysiekCard] = container.querySelectorAll('.glass-panel');

    fireEvent.mouseEnter(kamilCard);
    fireEvent.mouseEnter(krzysiekCard);

    expect(kamilCard.style.borderColor).toBe(toCssRgb(playerColors.get('Kamil').border));
    expect(krzysiekCard.style.borderColor).toBe(toCssRgb(playerColors.get('Krzysiek').border));
    expect(kamilCard.style.borderColor).not.toBe(krzysiekCard.style.borderColor);
  });
});
