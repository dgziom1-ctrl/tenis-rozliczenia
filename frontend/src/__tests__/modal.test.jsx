import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Modal from '../components/common/Modal';

let originalSetPointerCapture;

afterEach(() => {
  if (originalSetPointerCapture === undefined) {
    delete HTMLElement.prototype.setPointerCapture;
  } else {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: originalSetPointerCapture,
    });
  }
  originalSetPointerCapture = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function dispatchPointer(target, type, properties) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, properties);
  target.dispatchEvent(event);
}

describe('Modal — dolny arkusz', () => {
  it('przechwytuje wskaźnik i przesuwa arkusz dokładnie o ruch palca', async () => {
    const capture = vi.fn();
    originalSetPointerCapture = HTMLElement.prototype.setPointerCapture;
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: capture,
    });

    render(
      <Modal align="bottom" onClose={vi.fn()} title="Filtr">
        <button type="button">Opcja</button>
      </Modal>,
    );

    await waitFor(() => expect(document.body.querySelector('.modal-overlay')).toHaveClass('is-open'));
    const handle = document.body.querySelector('.sheet-drag-handle');
    const panel = document.body.querySelector('.modal-panel');

    dispatchPointer(handle, 'pointerdown', { pointerId: 7, pointerType: 'touch', button: 0, clientY: 100 });
    dispatchPointer(handle, 'pointermove', { pointerId: 7, pointerType: 'touch', button: 0, clientY: 184 });

    expect(capture).toHaveBeenCalledWith(7);
    expect(panel.style.transform).toBe('translate3d(0, 84px, 0)');
  });
});
