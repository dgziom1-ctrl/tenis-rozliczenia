import { useCallback, useEffect, useRef, useState } from 'react';
import { MODAL_EXIT_MS, REDUCED_MOTION_MODAL_EXIT_MS } from '@/constants';
import { useReducedMotion } from './useReducedMotion';

/**
 * Dla własnych przycisków zamknięcia: najpierw uruchamia kontrolowane wyjście
 * wspólnego Modala, a dopiero po nim powiadamia rodzica i pozwala na unmount.
 */
export function useModalExit(onClose: () => void) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = reducedMotion ? REDUCED_MOTION_MODAL_EXIT_MS : MODAL_EXIT_MS;

  const close = useCallback(() => {
    if (timerRef.current !== null) return;
    setOpen(false);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onClose();
    }, duration);
  }, [duration, onClose]);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  return { open, close };
}
