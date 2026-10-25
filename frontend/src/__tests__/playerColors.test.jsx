import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PlayerProfileCard from '../components/players/PlayerProfileCard';
import { getPlayerColor } from '../constants/colors';

const toCssRgb = hex => `rgb(${hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16)).join(', ')})`;

describe('kolory profili graczy', () => {
  it('przypisuje stabilne, różne obramowania Kamilowi i Rafałowi', () => {
    const { container } = render(
      <>
        <PlayerProfileCard player={{ name: 'Kamil' }} onDelete={vi.fn()} isOrganizer />
        <PlayerProfileCard player={{ name: 'Rafał' }} onDelete={vi.fn()} isOrganizer={false} />
      </>,
    );
    const [kamilCard, rafalCard] = container.querySelectorAll('.glass-panel');

    fireEvent.mouseEnter(kamilCard);
    fireEvent.mouseEnter(rafalCard);

    expect(kamilCard.style.borderColor).toBe(toCssRgb(getPlayerColor('Kamil').border));
    expect(rafalCard.style.borderColor).toBe(toCssRgb(getPlayerColor('Rafał').border));
    expect(kamilCard.style.borderColor).not.toBe(rafalCard.style.borderColor);
  });
});
