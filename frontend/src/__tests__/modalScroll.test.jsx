/**
 * Regresja: „klikam w okno, przesuwam palcem w dół, a przesuwa się strona
 * za nim". Trzy niezależne przyczyny — brak kurczliwego kontenera treści,
 * scroll chaining i blokada body zapisywana osobno przez każde okno.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import Modal from '../components/common/Modal';
import { lockScroll, unlockScroll, scrollLockCount } from '../utils/scrollLock';

const css = readFileSync('src/index.css', 'utf8');

function clearInlineScrollStyles() {
  for (const el of [document.documentElement, document.body]) {
    el.style.removeProperty('overflow');
    el.style.removeProperty('overscroll-behavior');
    el.style.removeProperty('padding-right');
  }
}

afterEach(() => {
  cleanup();
  // Gdyby któryś test zostawił otwartą blokadę, nie może zatruć kolejnych.
  while (scrollLockCount() > 0) unlockScroll();
  clearInlineScrollStyles();
  vi.restoreAllMocks();
});

/** jsdom nie ma layoutu — wartości przewijania trzeba wstrzyknąć. */
function stubScroll(el, { top, height, view }) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: top });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: height });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: view });
}

function touch(target, type, clientY) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: [{ clientY }],
  });
  target.dispatchEvent(event);
  return event;
}

describe('scrollLock — współdzielona blokada tła', () => {
  it('blokuje html i body, a po zwolnieniu przywraca poprzednie style', () => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.paddingRight = '12px';

    lockScroll();
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overscrollBehavior).toBe('none');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.overscrollBehavior).toBe('none');

    unlockScroll();
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(document.documentElement.style.paddingRight).toBe('');
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('12px');
  });

  it('dwa okna: zamknięcie jednego nie odblokowuje strony pod drugim', () => {
    lockScroll();
    lockScroll();
    expect(scrollLockCount()).toBe(2);

    unlockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    unlockScroll();
    expect(document.body.style.overflow).toBe('');
    expect(scrollLockCount()).toBe(0);
  });

  it('nadmiarowe unlock nie przewija licznika poniżej zera', () => {
    unlockScroll();
    lockScroll();
    expect(scrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    unlockScroll();
  });
});

describe('Modal — przewijalna treść', () => {
  it('blokada trzyma zarówno body, jak i html', async () => {
    const { unmount } = render(
      <Modal onClose={vi.fn()} title="Test">Treść</Modal>,
    );
    await waitFor(() => expect(document.body.querySelector('.modal-overlay')).toBeTruthy());
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('oznacza przewijalny kontener, żeby strażnik dotyku go przepuścił', async () => {
    render(<Modal onClose={vi.fn()} title="Test">Treść</Modal>);
    await waitFor(() => expect(document.body.querySelector('.modal-overlay')).toBeTruthy());
    expect(document.body.querySelector('.modal-body')).toHaveAttribute('data-modal-scroll');
  });

  it('okno bare też oznacza swój kontener', async () => {
    render(<Modal onClose={vi.fn()} bare ariaLabel="Test">Treść</Modal>);
    await waitFor(() => expect(document.body.querySelector('.modal-overlay')).toBeTruthy());
    expect(document.body.querySelector('.modal-bare-fill')).toHaveAttribute('data-modal-scroll');
  });

  it('zamknięcie jednego z dwóch okien zostawia blokadę dla drugiego', async () => {
    const first = render(<Modal onClose={vi.fn()} title="Pierwsze">A</Modal>);
    render(<Modal onClose={vi.fn()} title="Drugie">B</Modal>);
    await waitFor(() => expect(document.body.querySelectorAll('.modal-overlay')).toHaveLength(2));
    expect(scrollLockCount()).toBe(2);

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });
});

describe('Modal — strażnik gestów dotyku', () => {
  async function openModal() {
    render(
      <Modal onClose={vi.fn()} title="Test">
        <div style={{ height: 900 }}>Długa treść</div>
      </Modal>,
    );
    await waitFor(() => expect(document.body.querySelector('.modal-overlay')).toBeTruthy());
    return document.body.querySelector('.modal-body');
  }

  it('przepuszcza palec w głąb treści, gdy jest jeszcze co przewijać', async () => {
    const body = await openModal();
    stubScroll(body, { top: 0, height: 900, view: 300 });

    touch(body, 'touchstart', 500);
    const move = touch(body, 'touchmove', 420);
    expect(move.defaultPrevented).toBe(false);
  });

  it('blokuje gest na krawędzi, żeby nie uciekł na stronę', async () => {
    const body = await openModal();
    stubScroll(body, { top: 600, height: 900, view: 300 });

    touch(body, 'touchstart', 500);
    const move = touch(body, 'touchmove', 420);
    expect(move.defaultPrevented).toBe(true);
  });

  it('blokuje gest na scrimie i nagłówku okna', async () => {
    const body = await openModal();
    stubScroll(body, { top: 0, height: 900, view: 300 });
    const overlay = document.body.querySelector('.modal-overlay');

    touch(overlay, 'touchstart', 500);
    expect(touch(overlay, 'touchmove', 420).defaultPrevented).toBe(true);
    expect(touch(document.body.querySelector('.modal-head'), 'touchmove', 400).defaultPrevented).toBe(true);
  });

  it('nie przewija krótkiej treści, która nie ma overflow', async () => {
    const body = await openModal();
    stubScroll(body, { top: 0, height: 300, view: 300 });

    touch(body, 'touchstart', 500);
    expect(touch(body, 'touchmove', 420).defaultPrevented).toBe(true);
  });
});

describe('CSS — okno musi mieć własny, zamknięty obszar przewijania', () => {
  it('.modal-body kurczy się w flexie i nie oddaje gestu stronie', () => {
    const rule = css.match(/\.modal-body\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/min-height:\s*0/);
    expect(rule).toMatch(/flex:\s*1\s+1\s+auto/);
    expect(rule).toMatch(/overflow-y:\s*auto/);
    expect(rule).toMatch(/overscroll-behavior:\s*contain/);
    expect(rule).toMatch(/touch-action:\s*pan-y/);
  });

  it('panel pozwala dzieciom się skurczyć', () => {
    const rule = css.match(/\.modal-panel\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/min-height:\s*0/);
    expect(rule).toMatch(/max-height:\s*100%/);
  });

  it('overlay i pełnoekranowy wariant też zawierają scroll', () => {
    expect(css.match(/\.modal-overlay\s*\{([^}]*)\}/)?.[1]).toMatch(/overscroll-behavior:\s*contain/);
    const bare = css.match(/\.modal-bare-fill\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(bare).toMatch(/overflow:\s*auto/);
    expect(bare).toMatch(/overscroll-behavior:\s*contain/);
    expect(bare).toMatch(/align-items:\s*safe center/);
  });
});
