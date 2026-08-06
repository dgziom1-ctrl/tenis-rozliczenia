import { useState, useRef, useCallback, useEffect } from 'react';
import { UNDO_TIMEOUT_SECONDS } from '@/constants';

interface UndoToast<T> {
  payload: T;
  secondsLeft: number;
}

export function useUndoTimer<T = unknown>(durationSeconds = UNDO_TIMEOUT_SECONDS) {
  const [undoToast, setUndoToast] = useState<UndoToast<T> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearUndo = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => () => clearUndo(), [clearUndo]);

  const startUndo = useCallback((payload: T) => {
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
