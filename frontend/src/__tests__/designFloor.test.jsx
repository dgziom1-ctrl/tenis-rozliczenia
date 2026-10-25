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
import { FONT, TRACK } from '../constants/styles';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// ── Kompromis: zdania zamiast wersalików ─────────────────────────────────
/**
 * PR #14 udowodnił, że bez klimatu Cyber-Ponk aplikacja traci ducha, ale
 * rozstrzelane WIELKIE LITERY utrudniały czytanie etykiet. Test pilnuje, żeby
 * wspólne helpery typografii nie wróciły do uppercase. Statyczny odpowiednik
 * (wszystkie pliki CSS/TSX) jest w `scripts/audit-design.mjs`, reguła 5.
 */
describe('typografia — zdania, nie wersaliki', () => {
  it('FONT.display nie wymusza wielkich liter ani trackingu', () => {
    for (const size of ['0.75rem', '1rem', '2rem', '2.5rem']) {
      const style = FONT.display(size);
      expect(style.textTransform).toBe('none');
      expect(style.letterSpacing).toBe('normal');
      expect(style.fontFamily).toBe('var(--font-display)');
    }
  });

  it('FONT.monoLabel i skala TRACK są naturalne', () => {
    expect(FONT.monoLabel.textTransform).toBe('none');
    expect(FONT.monoLabel.letterSpacing).toBe('normal');
    expect(Object.values(TRACK).every((value) => value === 'normal')).toBe(true);
  });
});

// ── Kroje z Night City, bez CDN ────────────────────────────────────────────
/**
 * Cyberpunk 2077 składa HUD w Rajdhani, a dane techniczne w Orbitron. Kroje
 * jadą z bundla — inaczej offline apka traci tożsamość. Statyczny odpowiednik
 * to reguła 6 w `scripts/audit-design.mjs`.
 */
describe('typografia — kroje Cyberpunk 2077', () => {
  const read = (relative) => readFileSync(
    fileURLToPath(new URL(relative, import.meta.url)), 'utf8',
  );

  it('FONT.tech daje Orbitrona bez wersalików i trackingu', () => {
    const style = FONT.tech('2.5rem', 700);
    expect(style.fontFamily).toBe('var(--font-tech)');
    expect(style.fontWeight).toBe(700);
    expect(style.textTransform).toBe('none');
    expect(style.letterSpacing).toBe('normal');
  });

  it('FONT.display i FONT.mono zostają przy swoich krojach', () => {
    expect(FONT.display().fontFamily).toBe('var(--font-display)');
    expect(FONT.mono().fontFamily).toBe('var(--font-mono)');
  });

  // BLIK_NUMBER ma fallback „SKONFIGURUJ .ENV" — polskie „Ó" nie istnieje
  // w Orbitronie. Bez tego guarda słowo składałoby się z dwóch krojów.
  it('FONT.data daje Orbitrona dla liczb, a mono dla tekstu z polskimi znakami', () => {
    expect(FONT.data('600 000 000').fontFamily).toBe('var(--font-tech)');
    expect(FONT.data('600 000 000').fontWeight).toBe(500);
    expect(FONT.data('SKONFIGURUJ .ENV').fontFamily).toBe('var(--font-mono)');
    expect(FONT.data('').fontFamily).toBe('var(--font-mono)');
  });

  it('index.html nie ładuje fontów z zewnętrznego CDN', () => {
    const html = read('../../index.html');
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(html).not.toMatch(/Bebas/i);
  });

  it('main.tsx ładuje własny arkusz fontów zamiast CDN', () => {
    expect(read('../main.tsx')).toContain("import './fonts.css'");
  });

  it('fonts.css ma tylko woff2, oba podzbiory i unicode-range dla każdej reguły', () => {
    const fonts = read('../fonts.css');
    for (const pkg of [
      '@fontsource/rajdhani/files',
      '@fontsource/space-mono/files',
      '@fontsource-variable/orbitron/files',
    ]) {
      expect(fonts).toContain(pkg);
    }
    expect(fonts).toContain('rajdhani-latin-ext-600-normal.woff2');
    expect(fonts).toContain('space-mono-latin-ext-400-normal.woff2');
    expect(fonts).not.toMatch(/url\([^)]*(devanagari|vietnamese)/);
    expect(fonts).not.toMatch(/\.woff\)/);
    expect(fonts).not.toContain('Space Money');
    const faces = fonts.match(/@font-face/g) ?? [];
    const ranges = fonts.match(/unicode-range:/g) ?? [];
    expect(faces.length).toBeGreaterThan(10);
    expect(ranges.length).toBe(faces.length);
  });

  it('--font-tech to Orbitron, a --font-display to Rajdhani', () => {
    const css = read('../index.css');
    expect(css).toMatch(/--font-tech:\s*['"]Orbitron Variable['"]/);
    expect(css).toMatch(/--font-display:\s*['"]Rajdhani['"]/);
    expect(css).not.toMatch(/Bebas Neue/);
  });
});
