import { useState, useRef, useCallback, useEffect } from 'react';
import { UNDO_TIMEOUT_SECONDS } from '../constants';

/**
 * Manages an undo-toast with countdown. Returns:
 *   - undoToast: { playerName, previousValue, secondsLeft } | null
 *   - progressPct: 0–100 (for the progress bar)
 *   - startUndo(playerName, previousValue): kick off countdown
 *   - clearUndo(): cancel and reset
 */
export function useUndoTimer() {
  const [undoToast, setUndoToast] = useState(null);
  const timerRef    = useRef(null);
  const intervalRef = useRef(null);

  const clearUndo = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(intervalRef.current);
    timerRef.current    = null;
    intervalRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearUndo(), [clearUndo]);

  const startUndo = useCallback((playerName, previousValue, previousPayments) => {
    clearUndo();
    setUndoToast({ playerName, previousValue, previousPayments, secondsLeft: UNDO_TIMEOUT_SECONDS });

    intervalRef.current = setInterval(() => {
      setUndoToast(prev => {
        if (!prev || prev.secondsLeft <= 1) {
          clearUndo();
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, [clearUndo]);

  const dismissUndo = useCallback(() => {
    clearUndo();
    setUndoToast(null);
  }, [clearUndo]);

  const progressPct = undoToast ? (undoToast.secondsLeft / UNDO_TIMEOUT_SECONDS) * 100 : 0;

  return { undoToast, progressPct, startUndo, dismissUndo, clearUndo };
}
