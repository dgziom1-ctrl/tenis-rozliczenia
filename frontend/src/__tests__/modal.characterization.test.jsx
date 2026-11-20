// Charakteryzacja wspólnego Modala: otwarcie i wyjście na sterowanych zegarach,
// zamknięcie Escape / tłem / propsem `open`, blokada przewijania oraz przeciąganie
// dolnego arkusza ze sprężyną. Zegary (setTimeout, rAF, performance) są
// fałszywe, więc czasy wyjścia i sprężyna są sprawdzane co do milisekundy.
// Chroni wydzielanie sprężyny i obsługi przeciągania z Modala.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Modal from '../components/common/Modal';
import { scrollLockCount } from '../utils/scrollLock';
import { stubMedia } from './fixtures/domSnapshot';

const overlay = () => document.body.querySelector('.modal-overlay');
const panel = () => document.body.querySelector('.modal-panel');
const handle = () => document.body.querySelector('.sheet-drag-handle');

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

/** jsdom nie ma PointerEvent — zdarzenie generyczne z potrzebnymi polami, jak w modal.test.jsx. */
function pointer(target, type, properties) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: 'touch', button: 0 }, properties);
  act(() => { target.dispatchEvent(event); });
}

function key(target, name) {
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })); });
}

describe('Modal — charakteryzacja', () => {
  beforeEach(() => {
    stubMedia();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('wchodzi w dwóch krokach: najpierw ukryte, po klatce otwarte i dostępne', () => {
    render(<Modal onClose={vi.fn()} title="Okno"><p>Treść</p></Modal>);
    expect(overlay()).toHaveClass('is-closing');
    expect(overlay()).toHaveAttribute('aria-hidden', 'true');
    expect(overlay()).not.toHaveAttribute('aria-modal');

    advance(16);
    expect(overlay()).toHaveClass('is-open');
    expect(overlay()).toHaveAttribute('aria-hidden', 'false');
    expect(overlay()).toHaveAttribute('aria-modal', 'true');
    expect(overlay()).toHaveAttribute('aria-labelledby');
    expect(document.getElementById(overlay().getAttribute('aria-labelledby'))).toHaveTextContent('Okno');
  });

  it.each([
    ['center', 280],
    ['bottom', 320],
  ])('Escape (%s): wyjście trwa %i ms, a dopiero potem wołane jest onClose', (align, exitMs) => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} title="Okno" align={align}><p>Treść</p></Modal>);
    advance(16);
    key(overlay(), 'Escape');

    expect(overlay()).toHaveClass('is-closing');
    advance(exitMs - 1);
    expect(onClose).not.toHaveBeenCalled();
    expect(overlay()).not.toBeNull();
    advance(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(overlay()).toBeNull();
  });

  it('przy ograniczonym ruchu wyjście trwa 180 ms', () => {
    stubMedia({ reducedMotion: true });
    const onClose = vi.fn();
    render(<Modal onClose={onClose} title="Okno"><p>Treść</p></Modal>);
    advance(16);
    key(overlay(), 'Escape');
    advance(179);
    expect(onClose).not.toHaveBeenCalled();
    advance(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape przed pierwszą klatką też rozpoczyna wyjście', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} title="Okno"><p>Treść</p></Modal>);
    key(overlay(), 'Escape');
    advance(280);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('podwójny Escape wola onClose raz', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} title="Okno"><p>Treść</p></Modal>);
    advance(16);
    key(overlay(), 'Escape');
    advance(100);
    // Drugi Escape nie restartuje licznika wyjścia: onClose przychodzi w 280 ms od pierwszego.
    key(overlay(), 'Escape');
    advance(180);
    expect(onClose).toHaveBeenCalledTimes(1);
    advance(500);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('kliknięcie w tło zamyka, w panel — nie; wyłączone przez closeOnBackdrop', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal onClose={onClose} title="Okno"><p data-testid="body">Treść</p></Modal>);
    advance(16);
    act(() => { panel().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    advance(400);
    expect(onClose).not.toHaveBeenCalled();

    act(() => { overlay().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    advance(280);
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(<Modal onClose={onClose} title="Okno" closeOnBackdrop={false} open key="again"><p>Treść</p></Modal>);
    advance(16);
    act(() => { overlay().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    advance(400);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('przycisk zamknięcia w nagłówku zamyka okno', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} title="Okno"><p>Treść</p></Modal>);
    advance(16);
    act(() => { document.body.querySelector('.modal-close-btn').click(); });
    advance(280);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('open={false} chowa okno animacją bez wołania onClose, a ponowne otwarcie w trakcie ją przerywa', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal onClose={onClose} open title="Okno"><p>Treść</p></Modal>);
    advance(16);
    rerender(<Modal onClose={onClose} open={false} title="Okno"><p>Treść</p></Modal>);
    expect(overlay()).toHaveClass('is-closing');
    advance(279);
    expect(overlay()).not.toBeNull();
    advance(1);
    expect(overlay()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    rerender(<Modal onClose={onClose} open title="Okno"><p>Treść</p></Modal>);
    advance(16);
    expect(overlay()).toHaveClass('is-open');
    rerender(<Modal onClose={onClose} open={false} title="Okno"><p>Treść</p></Modal>);
    advance(100);
    rerender(<Modal onClose={onClose} open title="Okno"><p>Treść</p></Modal>);
    advance(16);
    advance(1000);
    expect(overlay()).toHaveClass('is-open');
  });

  it('odmontowanie w trakcie wyjścia nie woła onClose po fakcie', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Modal onClose={onClose} title="Okno"><p>Treść</p></Modal>);
    advance(16);
    key(overlay(), 'Escape');
    unmount();
    advance(2000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('blokada przewijania trwa do końca wyjścia i jest wspólna dla kilku okien', () => {
    const first = render(<Modal onClose={vi.fn()} title="Pierwsze"><p>1</p></Modal>);
    const second = render(<Modal onClose={vi.fn()} title="Drugie"><p>2</p></Modal>);
    expect(scrollLockCount()).toBe(2);
    expect(document.documentElement.style.overflow).toBe('hidden');

    first.unmount();
    expect(scrollLockCount()).toBe(1);
    expect(document.documentElement.style.overflow).toBe('hidden');
    second.unmount();
    expect(scrollLockCount()).toBe(0);
    expect(document.documentElement.style.overflow).toBe('');

    const onClose = vi.fn();
    render(<Modal onClose={onClose} title="Okno"><p>3</p></Modal>);
    advance(16);
    key(overlay(), 'Escape');
    advance(200);
    expect(document.documentElement.style.overflow).toBe('hidden');
    advance(80);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('wariant bez panelu (bare) ma etykietę z ariaLabel, a wariant bez tytułu — brak aria-labelledby', () => {
    render(<Modal onClose={vi.fn()} bare ariaLabel="Pełny ekran"><p>Treść</p></Modal>);
    expect(overlay()).toHaveAttribute('aria-label', 'Pełny ekran');
    expect(overlay()).not.toHaveAttribute('aria-labelledby');
    expect(panel()).toBeNull();
    expect(document.body.querySelector('.modal-bare-fill')).not.toBeNull();
  });

  describe('dolny arkusz — przeciąganie', () => {
    const renderSheet = (onClose = vi.fn()) => {
      render(<Modal align="bottom" onClose={onClose} title="Filtr"><p>Treść</p></Modal>);
      advance(16);
      return onClose;
    };

    it('uchwyt jest tylko w dolnym arkuszu', () => {
      render(<Modal onClose={vi.fn()} title="Środek"><p>Treść</p></Modal>);
      advance(16);
      expect(handle()).toBeNull();
    });

    it('ruch palca ustawia transform i przygasza tło proporcjonalnie do przesunięcia', () => {
      renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      pointer(handle(), 'pointermove', { clientY: 400 });
      expect(panel().style.transform).toBe('translate3d(0, 300px, 0)');
      expect(panel().style.transition).toBe('none');
      const progress = Number(overlay().style.getPropertyValue('--scrim-progress'));
      expect(progress).toBeCloseTo(1 - 300 / (window.innerHeight * 0.72), 5);
      expect(overlay().style.getPropertyValue('--modal-motion-duration')).toBe('0ms');
    });

    it('ruch w górę nie podnosi arkusza ponad pozycję spoczynkową', () => {
      renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 300 });
      pointer(handle(), 'pointermove', { clientY: 100 });
      expect(panel().style.transform).toBe('translate3d(0, 0px, 0)');
    });

    it('przeciągnięcie daleko zamyka: sprężyna wywozi arkusz, potem wyjście, potem onClose', () => {
      const onClose = renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      pointer(handle(), 'pointermove', { clientY: 400 });
      pointer(handle(), 'pointerup', { clientY: 400 });

      // W trakcie ruchu sprężyny okno jeszcze się nie zamyka; potem wyjście (320 ms).
      advance(100);
      expect(onClose).not.toHaveBeenCalled();
      expect(overlay()).not.toBeNull();
      advance(1200 + 320);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(overlay()).toBeNull();
    });

    it('krótkie przeciągnięcie wraca sprężyną i czyści style, bez zamykania', () => {
      const onClose = renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      pointer(handle(), 'pointermove', { clientY: 140 });
      pointer(handle(), 'pointerup', { clientY: 140 });
      advance(1500);
      expect(onClose).not.toHaveBeenCalled();
      expect(panel().style.transform).toBe('');
      expect(panel().style.transition).toBe('');
      // Po powrocie tło wraca pod kontrolę klas `.is-open`, a nie stylu inline.
      expect(overlay().style.getPropertyValue('--scrim-progress')).toBe('');
      expect(overlay().style.getPropertyValue('--modal-motion-duration')).toBe('');
    });

    it('anulowanie gestu (pointercancel) nigdy nie zamyka', () => {
      const onClose = renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      pointer(handle(), 'pointermove', { clientY: 500 });
      pointer(handle(), 'pointercancel', { clientY: 500 });
      advance(3000);
      expect(onClose).not.toHaveBeenCalled();
      expect(panel().style.transform).toBe('');
    });

    it('szybki gest w dół zamyka nawet przy małym przesunięciu', () => {
      const onClose = renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      advance(10);
      pointer(handle(), 'pointermove', { clientY: 160 });
      pointer(handle(), 'pointerup', { clientY: 160 });
      advance(3000);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('szybki, ale krótki gest zamyka też wtedy, gdy rzut po prędkości nie dosięga progu wysokiego arkusza', () => {
      const onClose = renderSheet();
      // Wysoki arkusz: próg zamknięcia to 32% wysokości (320 px), więc o zamknięciu decyduje prędkość.
      panel().getBoundingClientRect = () => ({ top: window.innerHeight - 1000, height: 1000 });
      pointer(handle(), 'pointerdown', { clientY: 100 });
      advance(40);
      pointer(handle(), 'pointermove', { clientY: 140 });
      advance(40);
      pointer(handle(), 'pointermove', { clientY: 180 });
      pointer(handle(), 'pointerup', { clientY: 180 });
      advance(3000);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('powolny gest o tym samym przesunięciu wraca zamiast zamykać', () => {
      const onClose = renderSheet();
      panel().getBoundingClientRect = () => ({ top: window.innerHeight - 1000, height: 1000 });
      pointer(handle(), 'pointerdown', { clientY: 100 });
      advance(400);
      pointer(handle(), 'pointermove', { clientY: 140 });
      advance(400);
      pointer(handle(), 'pointermove', { clientY: 180 });
      pointer(handle(), 'pointerup', { clientY: 180 });
      advance(3000);
      expect(onClose).not.toHaveBeenCalled();
    });

    /** Przesunięcie panelu w kolejnych klatkach sprężyny (co 16 ms). */
    function springTrace(releaseY) {
      renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      pointer(handle(), 'pointermove', { clientY: releaseY });
      pointer(handle(), 'pointerup', { clientY: releaseY });
      const trace = [];
      for (let frame = 0; frame < 80; frame += 1) {
        advance(16);
        const match = /translate3d\(0, (-?[\d.]+)px, 0\)/.exec(panel()?.style.transform ?? '');
        trace.push(match ? Number(Number(match[1]).toFixed(3)) : null);
      }
      return trace;
    }

    it('przebieg sprężyny przy powrocie arkusza jest stały (krzywa i czas)', () => {
      expect(springTrace(140)).toMatchSnapshot();
    });

    it('przebieg sprężyny przy wywożeniu arkusza poza ekran jest stały', () => {
      expect(springTrace(400)).toMatchSnapshot();
    });

    it('przy ograniczonym ruchu zamyka od razu, bez sprężyny', () => {
      stubMedia({ reducedMotion: true });
      const onClose = renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100 });
      pointer(handle(), 'pointermove', { clientY: 400 });
      pointer(handle(), 'pointerup', { clientY: 400 });
      expect(panel().style.transform).toBe('');
      advance(180);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('prawy przycisk myszy nie zaczyna przeciągania', () => {
      renderSheet();
      pointer(handle(), 'pointerdown', { clientY: 100, pointerType: 'mouse', button: 2 });
      pointer(handle(), 'pointermove', { clientY: 400, pointerType: 'mouse' });
      expect(panel().style.transform).toBe('');
    });
  });
});
