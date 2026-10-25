import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Header from '../components/layout/Header';
import { ToastProvider } from '../components/common/Toast';

/**
 * Easter egg: pięć kliknięć w tytuł wysypuje konfetti.
 *
 * Zgłoszona usterka: „confetti nie działa”. Przyczyna nie leżała w React —
 * komponent ustawiał `animation: confettiBurst …`, ale w `index.css`
 * brakowało `@keyframes confettiBurst`, więc przeglądarka odrzucała całą
 * deklarację, a 40 emoji lądowało w górnej krawędzi ekranu i tam zostawało.
 * Brakującą regułę wyłapuje teraz `npm run lint:css` (kierunek
 * „@keyframes brakuje”), a ten test pilnuje strony komponentu: warstwy w DOM,
 * kompletnego zestawu kawałków, restartu animacji i wariantu bez ruchu.
 */
function renderHeader() {
  return render(
    <ToastProvider>
      <Header
        isMuted={false}
        setIsMuted={() => {}}
        isConnected
        scrolled={false}
        theme="dark"
        onToggleTheme={() => {}}
        onShowGuide={() => {}}
      />
    </ToastProvider>,
  );
}

/** Kliknięcie w tytuł tyle razy, ile trzeba. */
function clickTitle(times = 5) {
  const title = screen.getByRole('button', { name: /CYBER-PONK/i });
  for (let i = 0; i < times; i += 1) fireEvent.click(title);
  return title;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('easter egg — konfetti', () => {
  it('pięć kliknięć w tytuł wysypuje konfetti', () => {
    const { container } = renderHeader();
    expect(container.querySelector('.chaos-layer')).toBeNull();

    clickTitle(5);

    const layer = container.querySelector('.chaos-layer');
    expect(layer).not.toBeNull();
    // Dekoracja: nie może trafić do drzewa dostępności ani przechwytywać kliknięć.
    expect(layer).toHaveAttribute('aria-hidden', 'true');

    const pieces = layer.querySelectorAll('.chaos-piece');
    expect(pieces).toHaveLength(44);
    // Każdy kawałek musi dostać animację i oba parametry sterujące ruchem.
    const style = pieces[0].getAttribute('style');
    expect(style).toContain('confettiBurst');
    expect(style).toContain('--drift');
    expect(style).toContain('--spin');
  });

  it('cztery kliknięcia nie wystarczają', () => {
    const { container } = renderHeader();
    clickTitle(4);
    expect(container.querySelector('.chaos-layer')).toBeNull();
  });

  it('powtórne odpalenie w trakcie efektu restartuje animację', () => {
    const { container } = renderHeader();
    clickTitle(5);
    const first = container.querySelectorAll('.chaos-piece')[0];

    clickTitle(5);
    const second = container.querySelectorAll('.chaos-piece')[0];

    // Nowe węzły, nie tylko zaktualizowane — inaczej animacja z `forwards`
    // stałaby na końcu i konfetti wyglądałoby na zamrożone.
    expect(second).not.toBe(first);
    expect(second.getAttribute('style')).toContain('confettiBurst');
  });

  it('efekt sprząta się sam po czterech sekundach', () => {
    vi.useFakeTimers();
    const { container } = renderHeader();
    clickTitle(5);
    expect(container.querySelector('.chaos-layer')).not.toBeNull();

    act(() => { vi.advanceTimersByTime(4100); });
    expect(container.querySelector('.chaos-layer')).toBeNull();
  });

  it('przy prefers-reduced-motion pokazuje statyczną posypkę bez animacji', () => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = vi.fn((query) => ({
      matches: query.includes('reduced-motion'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    try {
      const { container } = renderHeader();
      clickTitle(5);

      const pieces = container.querySelectorAll('.chaos-piece');
      expect(pieces).toHaveLength(44);
      expect(container.querySelectorAll('.chaos-piece-static')).toHaveLength(44);
      // Żaden kawałek nie może nieść animacji, gdy system prosi o brak ruchu.
      expect(pieces[0].getAttribute('style')).not.toContain('confettiBurst');
      expect(container.querySelector('.chaos-flash')).toBeNull();
    } finally {
      globalThis.matchMedia = original;
    }
  });
});
