import { useCallback, useRef } from 'react';
import type { MutableRefObject, PointerEvent, RefObject } from 'react';
import { springTo } from '@/utils/spring';

interface DragState {
  pointerId: number;
  startY: number;
  startOffset: number;
  currentOffset: number;
  lastY: number;
  lastTime: number;
  velocity: number;
}

const PROJECT_VELOCITY_MS = 220;

interface UseSheetDragOptions {
  panelRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  /** Czy okno jest już widoczne (po animacji wejścia) — wcześniej gest jest ignorowany. */
  visibleRef: RefObject<boolean>;
  /** Anulowanie trwającej sprężyny; wspólne z zamykaniem okna. */
  cancelSpringRef: MutableRefObject<(() => void) | null>;
  canDrag: boolean;
  reducedMotion: boolean;
  requestClose: () => void;
}

/**
 * Przeciąganie dolnego arkusza: Pointer Events z przechwyceniem wskaźnika,
 * tło przygasa za palcem, a po puszczeniu sprężyna z prędkością gestu albo
 * wywozi arkusz (zamknięcie), albo przywraca go na miejsce.
 */
export function useSheetDrag({
  panelRef, overlayRef, visibleRef, cancelSpringRef, canDrag, reducedMotion, requestClose,
}: UseSheetDragOptions) {
  const dragRef = useRef<DragState | null>(null);

  const setScrimProgress = useCallback((progress: number, immediate = false) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.setProperty('--scrim-progress', String(Math.max(0, Math.min(1, progress))));
    if (immediate) overlay.style.setProperty('--modal-motion-duration', '0ms');
    else overlay.style.removeProperty('--modal-motion-duration');
  }, [overlayRef]);

  const updateDragStyle = useCallback((offset: number) => {
    const panel = panelRef.current;
    if (!panel) return;
    const height = window.innerHeight;
    panel.style.transition = 'none';
    panel.style.transform = `translate3d(0, ${Math.max(0, offset)}px, 0)`;
    setScrimProgress(1 - Math.max(0, offset) / Math.max(height * 0.72, 1), true);
  }, [panelRef, setScrimProgress]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!canDrag || !visibleRef.current || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const panel = panelRef.current;
    if (!panel) return;

    cancelSpringRef.current?.();
    cancelSpringRef.current = null;
    const rect = panel.getBoundingClientRect();
    // Odległość od spoczynkowego położenia dolnej krawędzi — poprawna także
    // wtedy, gdy palec złapie arkusz w trakcie wjazdu.
    const currentOffset = Math.max(0, rect.top - (window.innerHeight - rect.height));
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: currentOffset,
      currentOffset,
      lastY: event.clientY,
      lastTime: now,
      velocity: 0,
    };

    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* przechwycenie może zniknąć przy odmontowaniu */ }
    event.preventDefault();
    updateDragStyle(currentOffset);
  }, [canDrag, cancelSpringRef, panelRef, visibleRef, updateDragStyle]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const now = performance.now();
    const deltaTime = now - drag.lastTime;
    if (deltaTime > 0) {
      const sampleVelocity = (event.clientY - drag.lastY) / deltaTime;
      drag.velocity = drag.velocity * 0.35 + sampleVelocity * 0.65;
    }
    drag.lastY = event.clientY;
    drag.lastTime = now;
    drag.currentOffset = Math.max(0, drag.startOffset + event.clientY - drag.startY);
    updateDragStyle(drag.currentOffset);
    event.preventDefault();
  }, [updateDragStyle]);

  const finishDrag = useCallback((event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
    const projectedOffset = drag.currentOffset + drag.velocity * PROJECT_VELOCITY_MS;
    const dismiss = !cancelled && (
      projectedOffset > Math.max(120, panelHeight * 0.32)
      || (drag.currentOffset > 32 && drag.velocity > 0.85)
    );
    const target = dismiss ? panelHeight + 32 : 0;

    cancelSpringRef.current?.();
    if (reducedMotion) {
      panelRef.current?.style.removeProperty('transform');
      panelRef.current?.style.removeProperty('transition');
      overlayRef.current?.style.removeProperty('--scrim-progress');
      overlayRef.current?.style.removeProperty('--modal-motion-duration');
      if (dismiss) requestClose();
      return;
    }

    cancelSpringRef.current = springTo({
      from: drag.currentOffset,
      to: target,
      velocity: drag.velocity,
      onUpdate: updateDragStyle,
      onComplete: () => {
        cancelSpringRef.current = null;
        if (dismiss) {
          // Panel jest już poza ekranem; pozostały tylko zsynchronizowane
          // wygaszenie scrimu i blur.
          requestClose();
        } else {
          const panel = panelRef.current;
          if (panel) {
            panel.style.removeProperty('transform');
            panel.style.removeProperty('transition');
          }
          const overlay = overlayRef.current;
          overlay?.style.removeProperty('--scrim-progress');
          overlay?.style.removeProperty('--modal-motion-duration');
        }
      },
    });
  }, [cancelSpringRef, overlayRef, panelRef, requestClose, updateDragStyle, reducedMotion]);

  return { handlePointerDown, handlePointerMove, finishDrag };
}
