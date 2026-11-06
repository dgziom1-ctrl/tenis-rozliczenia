import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { SectionHeader, PanelHeader } from '../components/common/SharedUI';
import BootSequence from '../components/common/BootSequence';

describe('glitch nagłówków i sekwencja startowa', () => {
  it('nagłówki niosą kopię tekstu dla efektu glitch, a tytuł zostaje jeden', () => {
    render(
      <>
        <SectionHeader icon={Users} title="Historia rankingu" />
        <PanelHeader icon={Users} title="Gracze" />
      </>,
    );
    expect(screen.getByText('Historia rankingu')).toHaveAttribute('data-text', 'Historia rankingu');
    expect(screen.getByRole('heading', { name: 'Gracze' })).toHaveAttribute('data-text', 'Gracze');
  });

  it('w testach sekwencja startowa się nie pokazuje', () => {
    const { container } = render(<BootSequence />);
    expect(container).toBeEmptyDOMElement();
  });
});
