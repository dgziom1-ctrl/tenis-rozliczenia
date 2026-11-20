import { useState, useRef, useCallback } from 'react';
import { makeId } from '@/utils/id';
import type { PaymentModalType } from './PaymentModal';
import type { AddPaymentResult } from '@/types/domain';

interface UsePaymentFlowOptions {
  playerName: string;
  onAddPayment: (playerName: string, amount: number, paymentId: string) => Promise<AddPaymentResult>;
  /** Wołane po udanym zapisie, zanim okna się zamkną (pasek cofania, animacja rozliczenia). */
  onPaid: (payment: { id: string; amount: number }) => void;
}

/**
 * Zapis wpłaty z karty: okno dowolnej kwoty, potwierdzenie całego długu,
 * stan zapisu i błąd. Id wpłaty jest ustalane raz na próbę i zostaje przy
 * ponowieniu po błędzie — dzięki temu ponowiony zapis nie policzy wpłaty dwa razy.
 */
export function usePaymentFlow({ playerName, onAddPayment, onPaid }: UsePaymentFlowOptions) {
  const [modal, setModal] = useState<PaymentModalType | null>(null);
  const [customAmt, setCustomAmt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmSettle, setConfirmSettle] = useState(false);

  const savingRef = useRef(false);
  const pendingPaymentIdRef = useRef<string | null>(null);

  const cancelModal = useCallback(() => {
    setPaymentError(null);
    setModal(null);
    setCustomAmt('');
    pendingPaymentIdRef.current = null;
  }, []);

  const savePayment = useCallback(async (amount: number) => {
    if (savingRef.current) return;
    savingRef.current = true;

    const paymentId = pendingPaymentIdRef.current ?? makeId();
    pendingPaymentIdRef.current = paymentId;

    setPaymentError(null);
    setIsSaving(true);

    try {
      const result = await onAddPayment(playerName, amount, paymentId);
      if (result?.paymentId && result?.success !== false) {
        pendingPaymentIdRef.current = null;
        onPaid({ id: result.paymentId, amount });
        cancelModal();
        setConfirmSettle(false);
      } else {
        setPaymentError(result?.error || 'Nie udało się zapisać wpłaty');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setPaymentError(message || 'Nie udało się zapisać wpłaty');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [playerName, onAddPayment, onPaid, cancelModal]);

  return {
    modal, setModal,
    customAmt, setCustomAmt,
    isSaving,
    paymentError, setPaymentError,
    confirmSettle, setConfirmSettle,
    cancelModal, savePayment,
  };
}
