import { useState, useRef, useCallback, useEffect } from 'react';
import { UNDO_TIMEOUT_SECONDS } from '../constants';

/**
 * Generic countdown-based undo toast.
 *
 * Returns:
 *   - undoToast: { payload: any, secondsLeft: number } | null
 *   - progressPct: 0–100 (for the progress bar)
 *   - startUndo(payload): kick off countdown with any payload
 *   - dismissUndo(): cancel and reset
 *   - clearUndo(): cancel timers without resetting state (internal use)
 *
 * Access your data via undoToast.payload.<whatever you passed to startUndo>.
 */
export function useUndoTimer(durationSeconds = UNDO_TIMEOUT_SECONDS) {
  const [undoToast,  setUndoToast]  = useState(null);
  const intervalRef = useRef(null);

  const clearUndo = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => () => clearUndo(), [clearUndo]);

  const startUndo = useCallback((payload) => {
    clearUndo();
    setUndoToast({ payload, secondsLeft: durationSeconds });

    intervalRef.current = setInterval(() => {
      setUndoToast(prev => {
        if (!prev || prev.secondsLeft <= 1) {
          clearUndo();
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, [clearUndo, durationSeconds]);

  const dismissUndo = useCallback(() => {
    clearUndo();
    setUndoToast(null);
  }, [clearUndo]);

  const progressPct = undoToast ? (undoToast.secondsLeft / durationSeconds) * 100 : 0;

  return { undoToast, progressPct, startUndo, dismissUndo, clearUndo };
}
