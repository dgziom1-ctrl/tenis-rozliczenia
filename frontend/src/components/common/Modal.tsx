import { useRef, useEffect, useLayoutEffect, useId, useState, useCallback, type ReactNode, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MODAL_EXIT_MS, REDUCED_MOTION_MODAL_EXIT_MS } from '@/constants';
import { FONT, TEXT, TRACK } from '@/constants/styles';
import { lockScroll, unlockScroll } from '@/utils/scrollLock';
import type { StyleWithVars } from '@/types/css';

/**
 * Wspólna nakładka dla wszystkich dialogów. Dolny arkusz zachowuje się jak
 * warstwa natywna: scrim i panel wchodzą razem, a uchwyt obsługuje Pointer Events
 * z przechwyceniem wskaźnika i sprężyną z prędkością puszczenia.
 */

type ModalAlign = 'center' | 'bottom';

interface ModalProps {
  onClose: () => void;
  /** Tekst nagłówka. Pomiń razem z `icon`, żeby zbudować własną szapkę w `children`. */
  title?: string;
  icon?: LucideIcon;
  /** Kolor akcentu nagłówka — domyślnie główny akcent motywu. */
  accent?: string;
  align?: ModalAlign;
  maxWidth?: number;
  /** Jawny stan otwarcia pozwala zamknąć okno również przez animację wyjścia. */
  open?: boolean;
  /** Dolne arkusze można przeciągać w dół; domyślnie tylko dla `align="bottom"`. */
  dragToDismiss?: boolean;
  children: ReactNode;
  /** Pasek akcji przyklejony do dołu panelu; nie przewija się z treścią. */
  footer?: ReactNode;
  /** Kliknięcie w tło zamyka okno. Wyłącz tam, gdzie łatwo zgubić wpisane dane. */
  closeOnBackdrop?: boolean;
  /** Nakładka bez własnego paddingu i panelu — dla ekranów pełnoekranowych. */
  bare?: boolean;
  /** Etykieta dla czytników ekranu, gdy okno nie ma widocznego tytułu. */
  ariaLabel?: string;
}

interface DragState {
  pointerId: number;
  startY: number;
  startOffset: number;
  currentOffset: number;
  lastY: number;
  lastTime: number;
  velocity: number;
}

const SHEET_EXIT_MS = 320;
const SPRING_RESPONSE_SECONDS = 0.3;
const SPRING_DAMPING = 0.8;
const PROJECT_VELOCITY_MS = 220;

/** Sprężyna drugiego rzędu — początkowa prędkość pochodzi bezpośrednio z gestu. */
function springTo({
  from,
  to,
  velocity,
  onUpdate,
  onComplete,
}: {
  from: number;
  to: number;
  velocity: number;
  onUpdate: (value: number) => void;
  onComplete: () => void;
}): () => void {
  const startedAt = performance.now();
  const omega = (2 * Math.PI) / SPRING_RESPONSE_SECONDS;
  const dampedOmega = omega * Math.sqrt(1 - SPRING_DAMPING ** 2);
  const offset = from - to;
  const initialVelocity = velocity * 1000;
  const sineAmplitude = (initialVelocity + SPRING_DAMPING * omega * offset) / dampedOmega;
  let frame = 0;

  const tick = (now: number) => {
    const seconds = (now - startedAt) / 1000;
    const envelope = Math.exp(-SPRING_DAMPING * omega * seconds);
    const wave = offset * Math.cos(dampedOmega * seconds)
      + sineAmplitude * Math.sin(dampedOmega * seconds);
    const current = to + envelope * wave;
    const currentVelocity = envelope * (
      -SPRING_DAMPING * omega * wave
      + (-offset * dampedOmega * Math.sin(dampedOmega * seconds)
        + sineAmplitude * dampedOmega * Math.cos(dampedOmega * seconds))
    );

    onUpdate(current);
    if ((Math.abs(current - to) < 0.5 && Math.abs(currentVelocity) < 5 && seconds > 0.08) || seconds > 1.2) {
      onUpdate(to);
      onComplete();
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export default function Modal({
  onClose,
  title,
  icon: Icon,
  accent = 'var(--co-cyan)',
  align = 'center',
  maxWidth = 420,
  open = true,
  dragToDismiss,
  children,
  footer,
  closeOnBackdrop = true,
  bare = false,
  ariaLabel,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const canDrag = dragToDismiss ?? align === 'bottom';
  const exitDuration = reducedMotion
    ? REDUCED_MOTION_MODAL_EXIT_MS
    : (align === 'bottom' ? SHEET_EXIT_MS : MODAL_EXIT_MS);

  const [isPresent, setIsPresent] = useState(open);
  const [isVisible, setIsVisible] = useState(false);
  const presentRef = useRef(open);
  const visibleRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingFrameRef = useRef<number | null>(null);
  const cancelSpringRef = useRef<(() => void) | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const clearPresentTimer = useCallback(() => {
    if (presentTimerRef.current) clearTimeout(presentTimerRef.current);
    presentTimerRef.current = null;
  }, []);

  const setScrimProgress = useCallback((progress: number, immediate = false) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.setProperty('--scrim-progress', String(Math.max(0, Math.min(1, progress))));
    if (immediate) overlay.style.setProperty('--modal-motion-duration', '0ms');
    else overlay.style.removeProperty('--modal-motion-duration');
  }, []);

  const requestClose = useCallback(() => {
    // Escape/close can arrive before the opening rAF has fired; it should still
    // start the exit sequence instead of being silently ignored.
    if (!presentRef.current || closeTimerRef.current) return;
    visibleRef.current = false;
    panelRef.current?.style.removeProperty('transform');
    panelRef.current?.style.removeProperty('transition');
    overlayRef.current?.style.removeProperty('--scrim-progress');
    overlayRef.current?.style.removeProperty('--modal-motion-duration');
    setIsVisible(false);
    if (openingFrameRef.current !== null) cancelAnimationFrame(openingFrameRef.current);
    openingFrameRef.current = null;
    cancelSpringRef.current?.();
    cancelSpringRef.current = null;
    clearCloseTimer();
    clearPresentTimer();
    closeTimerRef.current = setTimeout(() => {
      presentRef.current = false;
      setIsPresent(false);
      panelRef.current?.style.removeProperty('transform');
      panelRef.current?.style.removeProperty('transition');
      overlayRef.current?.style.removeProperty('--scrim-progress');
      overlayRef.current?.style.removeProperty('--modal-motion-duration');
      onCloseRef.current();
      closeTimerRef.current = null;
    }, exitDuration);
  }, [clearCloseTimer, clearPresentTimer, exitDuration]);

  // Zachowaj element w DOM-ie przez wyjście; jawne `open={false}` też dostaje
  // animację, a ponowne otwarcie w trakcie zamykania natychmiast ją przerywa.
  useEffect(() => {
    clearCloseTimer();
    clearPresentTimer();

    if (open) {
      presentRef.current = true;
      setIsPresent(true);
      panelRef.current?.style.removeProperty('transform');
      panelRef.current?.style.removeProperty('transition');
      overlayRef.current?.style.removeProperty('--scrim-progress');
      overlayRef.current?.style.removeProperty('--modal-motion-duration');
      if (openingFrameRef.current !== null) cancelAnimationFrame(openingFrameRef.current);
      openingFrameRef.current = requestAnimationFrame(() => {
        visibleRef.current = true;
        setIsVisible(true);
        openingFrameRef.current = null;
      });
    } else {
      visibleRef.current = false;
      setIsVisible(false);
      if (presentRef.current) {
        presentTimerRef.current = setTimeout(() => {
          presentRef.current = false;
          setIsPresent(false);
          presentTimerRef.current = null;
        }, exitDuration);
      }
    }

    return () => {
      if (openingFrameRef.current !== null) cancelAnimationFrame(openingFrameRef.current);
      openingFrameRef.current = null;
    };
  }, [open, exitDuration, clearCloseTimer, clearPresentTimer]);

  // Strona pozostaje zablokowana do końca animacji wyjścia, nie tylko do
  // kliknięcia X. Współdzielony licznik sprawia, że zamknięcie jednego z dwóch
  // okien nie odblokowuje tła pod drugim. `useLayoutEffect` zamiast `useEffect`:
  // blokada musi wejść w życie przed paintem, inaczej pierwszy gest zdąży
  // przesunąć stronę.
  useLayoutEffect(() => {
    if (!isPresent) return undefined;
    lockScroll();
    return unlockScroll;
  }, [isPresent]);

  useFocusTrap(overlayRef, isPresent && isVisible);

  useEffect(() => () => {
    clearCloseTimer();
    clearPresentTimer();
    if (openingFrameRef.current !== null) cancelAnimationFrame(openingFrameRef.current);
    cancelSpringRef.current?.();
  }, [clearCloseTimer, clearPresentTimer]);

  const updateDragStyle = useCallback((offset: number) => {
    const panel = panelRef.current;
    if (!panel) return;
    const height = window.innerHeight;
    panel.style.transition = 'none';
    panel.style.transform = `translate3d(0, ${Math.max(0, offset)}px, 0)`;
    setScrimProgress(1 - Math.max(0, offset) / Math.max(height * 0.72, 1), true);
  }, [setScrimProgress]);

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
  }, [canDrag, updateDragStyle]);

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
  }, [requestClose, updateDragStyle, reducedMotion]);

  if (!isPresent) return null;

  const alignClass = align === 'bottom' ? 'align-bottom' : 'align-center';
  const visibilityClass = isVisible ? 'is-open' : 'is-closing';
  const overlayStyle: StyleWithVars = { '--scrim-progress': isVisible ? 1 : 0 };

  return createPortal(
    <div
      ref={overlayRef}
      className={`modal-overlay ${alignClass}${bare ? ' modal-bare' : ''} ${visibilityClass}`}
      style={overlayStyle}
      tabIndex={-1}
      role="dialog"
      aria-hidden={!isVisible}
      aria-modal={isVisible ? 'true' : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          requestClose();
        }
      }}
      onClick={closeOnBackdrop ? event => {
        if (event.target === event.currentTarget) requestClose();
      } : undefined}
    >
      {bare ? (
        <div className="modal-bare-fill" data-modal-scroll>{children}</div>
      ) : (
        <div
          ref={panelRef}
          className={`modal-panel cut-corners${align === 'bottom' ? ' sheet' : ''}`}
          style={{ maxWidth }}
        >
          {canDrag && align === 'bottom' && (
            <div
              className="sheet-drag-handle"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={event => finishDrag(event)}
              onPointerCancel={event => finishDrag(event, true)}
              onLostPointerCapture={event => finishDrag(event, true)}
              aria-hidden="true"
            >
              <span />
            </div>
          )}
          {title && (
            <div className="modal-head">
              {Icon && <Icon size={16} style={{ color: accent, flexShrink: 0 }} aria-hidden="true" />}
              <h2 id={titleId} style={{ ...FONT.display(TEXT.lead, TRACK.normal), color: accent, margin: 0, flex: 1 }}>
                {title}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                className="modal-close-btn icon-btn"
                aria-label="Zamknij"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, flexShrink: 0,
                  marginRight: -10,
                  background: 'transparent', border: 'none',
                  color: 'var(--co-dim)', cursor: 'pointer',
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="modal-body" data-modal-scroll>{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      )}
    </div>,
    document.body,
  );
}
