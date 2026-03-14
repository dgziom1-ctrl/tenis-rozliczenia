import { useState, useCallback } from 'react';
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
  const { undoToast, progressPct, startUndo, dismissUndo } = useUndoTimer(8);

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
    if (!lastPayment) return;
    clearPaymentUndo();
    await onRemovePayment(playerName, lastPayment.id);
  }, [lastPayment, clearPaymentUndo, onRemovePayment, playerName]);

  const secondsLeft = undoToast?.secondsLeft ?? 0;

  return {
    lastPayment,
    secondsLeft,
    progressPct,
    isActive:          !!undoToast,
    startPaymentUndo,
    clearPaymentUndo,
    handleUndoPayment,
  };
}
