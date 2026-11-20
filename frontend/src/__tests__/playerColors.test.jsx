import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PlayerProfileCard from '../components/players/PlayerProfileCard';
import { createPlayerColorMap } from '../constants/colors';

const roster = ['Kamil', 'Krzysiek', 'Rafał', 'Przemek', 'Mariusz', 'Arek', 'Gosia', 'Ala'];
const playerColors = createPlayerColorMap(roster);
const toCssRgb = hex => `rgb(${hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16)).join(', ')})`;
const hueOf = hex => {
  const [r, g, b] = hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  const hue = max === r ? 60 * (((g - b) / delta) % 6)
    : max === g ? 60 * ((b - r) / delta + 2)
      : 60 * ((r - g) / delta + 4);
  return (hue + 360) % 360;
};
const hueDistance = (a, b) => {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
};

describe('kolory profili graczy', () => {
  it('przypisuje unikalne kolory całemu składowi niezależnie od kolejności listy', () => {
    expect(new Set(roster.map(name => playerColors.get(name).border)).size).toBe(roster.length);

    const hues = roster.map(name => hueOf(playerColors.get(name).border));
    const closestHueDistance = Math.min(...hues.flatMap((hue, i) => hues.slice(i + 1).map(other => hueDistance(hue, other))));
    expect(closestHueDistance).toBeGreaterThan(20);

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
