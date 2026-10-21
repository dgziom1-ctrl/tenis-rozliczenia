import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HoldToSettleButton from '../components/dashboard/HoldToSettleButton';

/**
 * Sedno P-01: krótkie dotknięcie nie może zapisać wpłaty, a przytrzymanie
 * ok. 0,8 s musi. Test pilnuje też alternatywy klawiaturowej, bo sam gest
 * przytrzymania byłby niedostępny dla części użytkowników.
 */
function pointer(type, { x = 10, y = 10 } = {}) {
  // jsdom nie implementuje PointerEvent i gubi clientX/Y w fireEvent.pointer*,
  // więc wysyłamy zdarzenie o właściwym typie z współrzędnymi.
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
}

describe('HoldToSettleButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('krótkie dotknięcie nie zapisuje wpłaty i pokazuje podpowiedź', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(<HoldToSettleButton amount={11.22} onConfirm={onConfirm} onKeyboardRequest={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent(button, pointer('pointerdown'));
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent(button, pointer('pointerup'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('PRZYTRZYMAJ DŁUŻEJ')).toBeInTheDocument();
  });

  it('przytrzymanie 0,8 s zapisuje wpłatę dokładnie raz', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(<HoldToSettleButton amount={11.22} onConfirm={onConfirm} onKeyboardRequest={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent(button, pointer('pointerdown'));
    act(() => { vi.advanceTimersByTime(820); });
    fireEvent(button, pointer('pointerup'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('przewinięcie rozpoczęte na przycisku anuluje gest', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(<HoldToSettleButton amount={11.22} onConfirm={onConfirm} onKeyboardRequest={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent(button, pointer('pointerdown'));
    fireEvent(button, pointer('pointermove', { x: 10, y: 40 }));
    act(() => { vi.advanceTimersByTime(900); });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('pojedyncze Enter otwiera potwierdzenie zamiast zapisywać', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    const onKeyboardRequest = vi.fn();
    render(<HoldToSettleButton amount={11.22} onConfirm={onConfirm} onKeyboardRequest={onKeyboardRequest} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.keyUp(button, { key: 'Enter' });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onKeyboardRequest).toHaveBeenCalledTimes(1);
  });
});
