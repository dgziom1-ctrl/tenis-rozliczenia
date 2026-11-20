// Charakteryzacja podsumowania roku (WrappedModal): zapis każdego slajdu,
// nawigacji i zamykania. Ruch jest wyłączony (`prefers-reduced-motion`), więc
// liczniki od razu pokazują wartości docelowe — snapshot nie zależy od zegara
// animacji. Chroni rozbicie komponentu na slajdy.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { serializeBody, stubMedia } from './fixtures/domSnapshot';
import WrappedModal from '../components/attendance/WrappedModal';
import { WRAPPED_DEMO_STATS } from './fixtures/wrappedDemoStats';

const nextButton = () => screen.findByRole('button', { name: /^(Dalej|Zamknij)$/ });

async function openAt(user, slide) {
  for (let i = 0; i < slide; i += 1) {
    await user.click(await nextButton());
  }
}

describe('WrappedModal — charakteryzacja', () => {
  beforeEach(() => {
    stubMedia({ reducedMotion: true });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-10T12:00:00'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    [0, 'intro'],
    [1, 'podsumowanie grupy ze sportami'],
    [2, 'najaktywniejszy miesiąc'],
    [3, 'najlepsza para'],
    [4, 'ranking: podium i reszta'],
    [5, 'mistrz roku'],
  ])('slajd %i: %s', async (slide) => {
    const user = userEvent.setup();
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => {}} />);
    await nextButton();
    await openAt(user, slide);
    expect(screen.getByText(`${slide + 1}/6`)).toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('bez pary i mistrza slajdów jest mniej, a ostatni to ranking', async () => {
    const user = userEvent.setup();
    const stats = { ...WRAPPED_DEMO_STATS, bestPair: null, champion: null, squashSessions: 0, badmintonSessions: 0, padelSessions: 0 };
    render(<WrappedModal stats={stats} onClose={() => {}} />);
    await nextButton();
    expect(screen.getByText('1/4')).toBeInTheDocument();
    await openAt(user, 1);
    expect(serializeBody()).toMatchSnapshot();
    await openAt(user, 2);
    expect(screen.getByText('4/4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zamknij' })).toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();
  });

  it('klawiatura: strzałki przewijają slajdy, spacja na przycisku go aktywuje, Escape zamyka', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={onClose} />);
    const next = await nextButton();
    const shell = next.closest('[role="presentation"]');

    shell.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2/6')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('3/6')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('2/6')).toBeInTheDocument();

    // Spacja na „Wstecz” aktywuje przycisk, a nie przewija slajd do przodu.
    screen.getByRole('button', { name: 'Poprzedni slajd' }).focus();
    await user.keyboard(' ');
    expect(screen.getByText('1/6')).toBeInTheDocument();

    // Na pierwszym slajdzie „Wstecz” znika razem z fokusem (ląduje na <body>, gdzie
    // Escape nie dociera do okna) — wracamy na „Dalej”.
    next.focus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('klik w tło przewija, „Wstecz” cofa, a ostatni „Zamknij” zamyka po animacji wyjścia', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={onClose} />);
    const next = await nextButton();
    await user.click(next.closest('[role="presentation"]'));
    expect(screen.getByText('2/6')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Poprzedni slajd' }));
    expect(screen.getByText('1/6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Poprzedni slajd' })).not.toBeInTheDocument();

    await openAt(user, 5);
    expect(onClose).not.toHaveBeenCalled();
    // Na slajdzie mistrza są dwa przyciski „Zamknij”: ten w treści i ten w nawigacji.
    await user.click((await screen.findAllByRole('button', { name: 'Zamknij' }))[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('wersja osadzona: pełny ekran bez portalu', () => {
    const { container } = render(<WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => {}} embedded />);
    expect(document.querySelector('.modal-overlay')).toBeNull();
    expect(within(container).getByLabelText('Podsumowanie roku 2025')).toBeInTheDocument();
    expect(serializeBody()).toMatchSnapshot();
  });
});
