/**
 * Regresje „design floor” — rzeczy, których axe i audit:contrast nie widzą:
 * stan rozwijanego panelu dla czytnika ekranu oraz animacja canvasu, która
 * pracuje poza ekranem. Zasady i ich źródła opisuje DESIGN-SKILLS.md.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(),
  runTransaction: vi.fn(),
  set: vi.fn(),
  get: vi.fn(() => Promise.resolve({ exists: () => false })),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
}));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));

import DashboardTab from '../components/dashboard/DashboardTab';
import ArenaCanvas from '../components/layout/ArenaCanvas';
import { ToastProvider } from '../components/common/Toast';

describe('legenda rang — stan dla czytnika ekranu', () => {
  const data = { summary: { totalWeeks: 3 }, players: [], payments: {} };

  it('przycisk ma aria-expanded i aria-controls, a panel dostaje id', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <DashboardTab data={data} history={[]} playSound={vi.fn()} />
      </ToastProvider>,
    );

    const toggle = screen.getByRole('button', { name: /co oznaczają rangi/i });
    const panel = document.getElementById('rank-guide-panel');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'rank-guide-panel');
    // ID istnieje także w stanie złożonym — inaczej aria-controls wskazuje
    // na nieistniejący element.
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');
  });
});

describe('ArenaCanvas — rAF tylko w polu widzenia', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalObserver = globalThis.IntersectionObserver;
  let callbacks = [];
  let rafSpy;
  let cancelSpy;

  beforeEach(() => {
    callbacks = [];
    const gradient = { addColorStop: vi.fn() };
    const ctx = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => gradient;
        }
        return vi.fn();
      },
      set() { return true; },
    });
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);

    globalThis.IntersectionObserver = class {
      constructor(callback) { callbacks.push(callback); }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    };

    rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
  });

  afterEach(() => {
    cleanup();
    rafSpy.mockRestore();
    cancelSpy.mockRestore();
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.IntersectionObserver = originalObserver;
  });

  it('zatrzymuje pętlę po opuszczeniu ekranu i wznawia po powrocie', () => {
    render(<ArenaCanvas chaosMode={false} />);
    expect(callbacks).toHaveLength(1);
    expect(rafSpy).toHaveBeenCalled();

    rafSpy.mockClear();
    cancelSpy.mockClear();
    act(() => { callbacks[0]([{ isIntersecting: false }]); });
    expect(cancelSpy).toHaveBeenCalled();
    expect(rafSpy).not.toHaveBeenCalled();

    act(() => { callbacks[0]([{ isIntersecting: true }]); });
    expect(rafSpy).toHaveBeenCalled();
  });
});
