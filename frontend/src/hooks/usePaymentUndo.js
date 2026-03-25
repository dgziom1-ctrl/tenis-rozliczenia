import { useState, useCallback, useEffect } from 'react';
import { useUndoTimer } from './useUndoTimer';

/**
 * Manages the per-card payment undo flow:
 *   1. A payment is saved → startPaymentUndo(payment) kicks off the 8s countdown
 *   2. User clicks "cofnij" → handleUndoPayment() fires onRemovePayment and resets
 *   3. Timer expires naturally → state resets on its own
 *
 * Also calls onPin/onUnpin so DashboardTab can pin the card at the top of the list
 * while the undo is active.
 */
export function usePaymentUndo({ playerName, onPin, onUnpin, onRemovePayment }) {
  const [lastPayment, setLastPayment] = useState(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const { undoToast, progressPct, startUndo, dismissUndo, clearUndo } = useUndoTimer(8);

  const clearPaymentUndo = useCallback(() => {
    dismissUndo();
    setLastPayment(null);
    onUnpin();
  }, [dismissUndo, onUnpin]);

  const startPaymentUndo = useCallback((payment) => {
    onPin(playerName);
    setLastPayment(payment);
    startUndo(payment);
  }, [playerName, onPin, startUndo]);

  const handleUndoPayment = useCallback(async () => {
    if (!lastPayment || isUndoing) return;
    setIsUndoing(true);

    // Zatrzymaj licznik, ale nie znikaj z UI dopóki usuwanie nie się powiedzie.
    clearUndo();

    try {
      const result = await onRemovePayment(playerName, lastPayment.id);
      if (result?.success) {
        clearPaymentUndo();
        return;
      }

      // Nie udało się cofnąć: przywróć licznik, żeby użytkownik mógł spróbować ponownie.
      startUndo(lastPayment);
    } finally {
      setIsUndoing(false);
    }
  }, [lastPayment, clearPaymentUndo, onRemovePayment, playerName, isUndoing, clearUndo, startUndo]);

  // Natural expiration: when countdown ends, remove undo UI and unpin the card.
  useEffect(() => {
    if (!undoToast && lastPayment && !isUndoing) {
      clearPaymentUndo();
    }
  }, [undoToast, lastPayment, isUndoing, clearPaymentUndo]);

  const secondsLeft = undoToast?.secondsLeft ?? 0;

  return {
    lastPayment,
    secondsLeft,
    progressPct,
    isActive:          !!undoToast,
    startPaymentUndo,
    clearPaymentUndo,
    handleUndoPayment,
    isUndoing,
  };
}
