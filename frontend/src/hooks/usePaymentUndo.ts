import { useState, useCallback, useEffect } from 'react';
import { useUndoTimer } from './useUndoTimer';
import type { Payment, TransactionResult } from '@/types/domain';

interface UsePaymentUndoOptions {
  playerName: string;
  onPin: (name: string) => void;
  onUnpin: () => void;
  onRemovePayment: (playerName: string, paymentId: string) => Promise<TransactionResult>;
}

export function usePaymentUndo({ playerName, onPin, onUnpin, onRemovePayment }: UsePaymentUndoOptions) {
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const { undoToast, progressPct, startUndo, dismissUndo, clearUndo } = useUndoTimer<Payment>(8);

  const clearPaymentUndo = useCallback(() => {
    dismissUndo();
    setLastPayment(null);
    onUnpin();
  }, [dismissUndo, onUnpin]);

  const startPaymentUndo = useCallback((payment: Payment) => {
    onPin(playerName);
    setLastPayment(payment);
    startUndo(payment);
  }, [playerName, onPin, startUndo]);

  const handleUndoPayment = useCallback(async () => {
    if (!lastPayment || isUndoing) return;
    setIsUndoing(true);
    clearUndo();
    try {
      const result = await onRemovePayment(playerName, lastPayment.id);
      if (result?.success) {
        clearPaymentUndo();
        return;
      }
      startUndo(lastPayment);
    } finally {
      setIsUndoing(false);
    }
  }, [lastPayment, clearPaymentUndo, onRemovePayment, playerName, isUndoing, clearUndo, startUndo]);

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
    isActive: !!undoToast,
    startPaymentUndo,
    clearPaymentUndo,
    handleUndoPayment,
    isUndoing,
  };
}
