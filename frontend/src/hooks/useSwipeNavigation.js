import { useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 60;

/**
 * Returns touch handlers that detect horizontal swipes and call onSwipeLeft/onSwipeRight.
 * Ignores swipes that originate on interactive elements or inside dialogs.
 */
export function useSwipeNavigation({ onSwipeLeft, onSwipeRight }) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    // Ignore predominantly vertical movement (scrolling)
    if (Math.abs(dy) > Math.abs(dx)) return;
    // Require minimum horizontal distance
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    // Ignore swipes starting on interactive elements or inside modals
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.target?.closest?.('[role="dialog"]')) return;

    if (dx < 0) {
      onSwipeLeft?.();
    } else {
      onSwipeRight?.();
    }
  }, [onSwipeLeft, onSwipeRight]);

  return { handleTouchStart, handleTouchEnd };
}
