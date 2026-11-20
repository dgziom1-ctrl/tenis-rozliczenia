import HoldToSettleButton from './HoldToSettleButton';

interface PaymentActionsProps {
  /** Pozostały dług gracza (zł). */
  debt: number;
  isPending: boolean;
  hasCredit: boolean;
  isSettled: boolean;
  isSaving: boolean;
  /** Przytrzymanie przycisku zapisuje cały dług od razu. */
  onSettleExact: () => void;
  /** Alternatywa z klawiatury: otwiera potwierdzenie zapisu całego długu. */
  onRequestConfirm: () => void;
  /** Otwiera okno wpłaty dowolnej kwoty. */
  onOpenCustom: () => void;
}

/** Przyciski wpłaty zależne od salda: zapis całego długu i wpłata innej kwoty. */
export default function PaymentActions({
  debt, isPending, hasCredit, isSettled, isSaving, onSettleExact, onRequestConfirm, onOpenCustom,
}: PaymentActionsProps) {
  return (
    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isPending && (
        <>
          <HoldToSettleButton
            amount={debt}
            disabled={isSaving}
            onConfirm={onSettleExact}
            onKeyboardRequest={onRequestConfirm}
          />
          <button onClick={onOpenCustom} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%', minHeight: 44 }}>
            + Inna kwota
          </button>
        </>
      )}
      {hasCredit && (
        <button onClick={onOpenCustom} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%', minHeight: 44 }}>
          + Wpłać więcej
        </button>
      )}
      {isSettled && (
        <button onClick={onOpenCustom} className="cyber-button-outline" style={{ padding: '8px 12px', width: '100%', minHeight: 44 }}>
          + Wpłać na zapas
        </button>
      )}
    </div>
  );
}
