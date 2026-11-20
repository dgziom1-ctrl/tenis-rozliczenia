/**
 * Regresja: dolny pasek „odjeżdżał” od dołu ekranu.
 *
 * Przyczyny były trzy i każda mogła wystąpić osobno:
 *  1. `position: fixed` wewnątrz kontenera z `transform`/`filter` —
 *     pasek kotwiczył się do przodka, nie do viewportu;
 *  2. breakpoint liczony tylko z szerokości — telefon w poziomie dostawał
 *     nawigację desktopową w normalnym przepływie strony;
 *  3. klawiatura na iOS zmienia visual viewport, a nie layout viewport.
 *
 * Test pilnuje kontraktu CSS i tego, że pasek faktycznie trafia do <body>.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import Navigation from '../components/layout/Navigation';
import { useKeyboardOpen } from '../hooks/useKeyboardOpen';

const css = readFileSync('src/index.css', 'utf8');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

function mediaBlocks(condition) {
  const escaped = condition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`@media\\s*${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'g');
  return [...css.matchAll(pattern)].map(match => match[1]);
}

afterEach(cleanup);

describe('CSS — dolny pasek jest przyklejony do viewportu', () => {
  it('używa fixed z zerem na dole i pełną szerokością', () => {
    const nav = rule('.mobile-nav');
    expect(nav).toMatch(/position:\s*fixed/);
    expect(nav).toMatch(/inset-inline:\s*0/);
    expect(nav).toMatch(/bottom:\s*0/);
    expect(nav).toMatch(/top:\s*auto/);
    expect(nav).toMatch(/width:\s*100%/);
  });

  it('respektuje bezpieczny obszar iPhone’a i nie dubluje tapnięć', () => {
    const nav = rule('.mobile-nav');
    expect(nav).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom,\s*0px\)/);
    expect(nav).toMatch(/touch-action:\s*manipulation/);
  });

  it('chowa się, gdy otwarta jest klawiatura', () => {
    const hidden = rule('body.keyboard-open .mobile-nav');
    expect(hidden).toMatch(/transform:\s*translate3d\(0,\s*110%,\s*0\)/);
    expect(hidden).toMatch(/pointer-events:\s*none/);
    expect(hidden).toMatch(/visibility:\s*hidden/);
  });

  it('powłoka aplikacji używa stabilnej wysokości `svh`', () => {
    const shell = rule('.app-shell');
    expect(shell).toMatch(/min-height:\s*100vh/);
    expect(shell).toMatch(/min-height:\s*100svh/);
  });
});

describe('CSS — breakpointy nie mylą szerokości z dotykiem', () => {
  it('telefon w poziomie i tablet dotykowy zachowują dolny pasek', () => {
    const mobile = mediaBlocks('(max-width: 639px), (max-height: 479px), (pointer: coarse)');
    expect(mobile.some(block => block.includes('.mobile-nav { display: flex; }'))).toBe(true);
    expect(mobile.some(block => block.includes('.desktop-nav { display: none; }'))).toBe(true);
  });

  it('desktopowa nawigacja wymaga też zapasu wysokości', () => {
    const desktop = mediaBlocks('(min-width: 640px) and (min-height: 480px)');
    expect(desktop.some(block => block.includes('.desktop-nav { display: block; }'))).toBe(true);
  });

  it('banery nad paskiem nie siadają na krawędzi na tablecie dotykowym', () => {
    const banner = rule('.bottom-banner');
    expect(banner).toMatch(/bottom:\s*calc\(var\(--nav-height\) \+ env\(safe-area-inset-bottom,\s*0px\)\)/);

    const desktopBanner = mediaBlocks('(min-width: 640px) and (min-height: 480px) and (pointer: fine)');
    expect(desktopBanner.some(block => block.includes('.bottom-banner { bottom: 0; }'))).toBe(true);
  });
});

describe('useKeyboardOpen — pasek znika tylko na czas pisania', () => {
  it('reaguje na fokus pola tekstowego i wraca po jego opuszczeniu', async () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    const { result } = renderHook(() => useKeyboardOpen());

    act(() => {
      input.focus();
      document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    await waitFor(() => expect(result.current).toBe(true));

    act(() => {
      input.blur();
      document.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    await waitFor(() => expect(result.current).toBe(false));

    input.remove();
  });

  it('nie chowa paska dla pola, które nie otwiera klawiatury', async () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    document.body.appendChild(checkbox);
    const { result } = renderHook(() => useKeyboardOpen());

    act(() => {
      checkbox.focus();
      document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    await waitFor(() => expect(result.current).toBe(false));

    checkbox.remove();
  });
});

describe('Navigation — pasek mobilny żyje poza drzewem Layoutu', () => {
  it('renderuje się bezpośrednio w <body>, z dala od transformów przodków', () => {
    const { container } = render(<Navigation activeTab="dashboard" setActiveTab={() => {}} />);
    const nav = screen
      .getAllByRole('navigation', { name: 'Nawigacja główna' })
      .find(element => element.classList.contains('mobile-nav'));
    expect(nav).toBeTruthy();
    expect(nav.parentElement).toBe(document.body);
    expect(container.contains(nav)).toBe(false);
  });

  it('zaznacza aktywną zakładkę i ma czytelne etykiety', () => {
    render(<Navigation activeTab="history" setActiveTab={() => {}} />);
    const active = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-current') === 'page');
    expect(active).toBeTruthy();
    expect(active).toHaveAccessibleName('Historia');
  });
});
