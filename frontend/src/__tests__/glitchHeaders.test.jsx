import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { SectionHeader, PanelHeader } from '../components/common/SharedUI';
import Header from '../components/layout/Header';
import { ToastProvider } from '../components/common/Toast';
import { MemoryRouter } from 'react-router';

describe('glitch nagłówków', () => {
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

  it('napis CYBER-PONK w nagłówku też ma efekt glitch', () => {
    const { container } = render(
      <MemoryRouter>
        <ToastProvider>
          <Header isMuted={false} setIsMuted={() => {}} scrolled={false} theme="dark"
            onToggleTheme={() => {}} onShowGuide={() => {}} />
        </ToastProvider>
      </MemoryRouter>,
    );
    const title = container.querySelector('.header-hero-title .glitch-text');
    expect(title).toHaveAttribute('data-text', 'CYBER-PONK');
  });
});
