import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { formatAmountShort } from '@/utils/format';

/** Czas przytrzymania. Długi na tyle, by wykluczyć przypadkowy dotyk, ale
 *  krótki, by nie zamieniać opłacenia w ćwiczenie z cierpliwości. */
export const HOLD_TO_SETTLE_MS = 800;

interface HoldToSettleButtonProps {
  amount: number;
  disabled?: boolean;
  onConfirm: () => void;
  /** Krótkie naciśnięcie klawisza otwiera zwykłe potwierdzenie — alternatywa
   *  dla osób, które nie mogą przytrzymać przycisku. */
  onKeyboardRequest: () => void;
}

/**
 * Przycisk „zapisz wpłatę” wymagający przytrzymania.
 *
 * Wcześniej zwykły `onClick` natychmiast księgował dług — jedno przypadkowe
 * dotknięcie podczas przewijania fałszowało rozliczenie. Teraz wypełniający się
 * pasek pokazuje intencję i moment zapisu, a krótkie dotknięcie tylko uczy gestu.
 * Na klawiaturze: przytrzymanie Enter/Space zapisuje, pojedyncze naciśnięcie
 * otwiera dialog potwierdzenia.
 */
export default function HoldToSettleButton({ amount, disabled = false, onConfirm, onKeyboardRequest }: HoldToSettleButtonProps) {
  const [holding, setHolding] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const hintTimerRef = useRef<number | null>(null);
  const describedBy = useId();

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flashHint = useCallback(() => {
    setShowHint(true);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setShowHint(false), 2200);
  }, []);

  const cancelHold = useCallback((hint = false) => {
    clearTimer();
    setHolding(false);
    if (hint) flashHint();
  }, [clearTimer, flashHint]);

  const completeHold = useCallback(() => {
    clearTimer();
    setHolding(false);
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 350);
    try { navigator.vibrate?.(15); } catch { /* wibracje niedostępne */ }
    onConfirm();
  }, [clearTimer, onConfirm]);

  const beginHold = useCallback(() => {
    if (disabled || timerRef.current !== null) return;
    setShowHint(false);
    setHolding(true);
    startedAtRef.current = performance.now();
    try { navigator.vibrate?.(8); } catch { /* wibracje niedostępne */ }
    timerRef.current = window.setTimeout(completeHold, HOLD_TO_SETTLE_MS);
  }, [completeHold, disabled]);

  useEffect(() => () => {
    clearTimer();
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
  }, [clearTimer]);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startPointRef.current = { x: event.clientX, y: event.clientY };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* przechwycenie opcjonalne */ }
    beginHold();
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const start = startPointRef.current;
    if (!start || timerRef.current === null) return;
    // Przewijanie listy rozpoczęte na przycisku anuluje gest zamiast go kończyć.
    if (Math.abs(event.clientX - start.x) > 12 || Math.abs(event.clientY - start.y) > 12) {
      cancelHold();
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    startPointRef.current = null;
    if (event.type === 'pointerup' && timerRef.current !== null) {
      const elapsed = performance.now() - startedAtRef.current;
      if (elapsed >= HOLD_TO_SETTLE_MS - 40) completeHold();
      else cancelHold(true);
      return;
    }
    cancelHold();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) return;
    // `detail === 0` oznacza aktywację z klawiatury/czytnika ekranu.
    if (event.detail === 0) {
      onKeyboardRequest();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.repeat) return;
    beginHold();
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (timerRef.current !== null) {
      const elapsed = performance.now() - startedAtRef.current;
      if (elapsed >= HOLD_TO_SETTLE_MS - 40) completeHold();
      else {
        cancelHold();
        onKeyboardRequest();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        className="cyber-button-yellow hold-confirm-btn"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => { startPointRef.current = null; cancelHold(); }}
        onLostPointerCapture={() => { startPointRef.current = null; cancelHold(); }}
        onPointerLeave={() => { if (timerRef.current !== null && !startPointRef.current) cancelHold(); }}
        onContextMenu={event => event.preventDefault()}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={() => cancelHold()}
        disabled={disabled}
        aria-label={`Przytrzymaj, aby zapisać wpłatę ${formatAmountShort(amount)} zł. Na klawiaturze naciśnij Enter, aby potwierdzić.`}
        aria-describedby={describedBy}
        style={{ padding: '10px 16px', width: '100%' }}
      >
        <span aria-hidden="true" className="hold-confirm-fill" style={{
          transform: `scaleX(${holding ? 1 : 0})`,
          transition: holding ? `transform ${HOLD_TO_SETTLE_MS}ms linear` : 'transform 120ms ease-out',
        }} />
        <span style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', letterSpacing: 'normal', lineHeight: 1 }}>
            {formatAmountShort(amount)} ZŁ
          </span>
          <span id={describedBy} style={{ fontSize: '0.75rem', letterSpacing: 'normal', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>
            {holding ? 'Trzymaj…' : showHint ? 'Przytrzymaj dłużej' : 'Przytrzymaj, aby zapisać'}
          </span>
        </span>
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {showHint ? 'Krótkie dotknięcie nie zapisało wpłaty. Przytrzymaj przycisk około 0,8 sekundy.' : ''}
      </p>
    </>
  );
}
