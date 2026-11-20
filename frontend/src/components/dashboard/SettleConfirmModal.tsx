import { CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { FONT } from '@/constants/styles';
import { formatAmountShort } from '@/utils/format';
import { BLIK_NUMBER } from '@/utils/blik';

interface SettleConfirmModalProps {
  open: boolean;
  playerName: string;
  /** Cały dług, który zostanie zapisany jako wpłata (zł). */
  debt: number;
  isSaving: boolean;
  errorMsg: string | null;
  onClose: () => void;
  /** Zamknięcie przyciskiem „Anuluj" czyści też błąd zapisu. */
  onCancel: () => void;
  onConfirm: () => void;
}

/** Potwierdzenie zapisu całego długu — ścieżka dla osób, które nie mogą przytrzymać przycisku. */
export default function SettleConfirmModal({
  open, playerName, debt, isSaving, errorMsg, onClose, onCancel, onConfirm,
}: SettleConfirmModalProps) {
  const isMobile = useIsMobile();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Zapisać wpłatę?"
      icon={CheckCircle2}
      align={isMobile ? 'bottom' : 'center'}
      maxWidth={420}
      footer={
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="cyber-button-outline"
            style={{ flex: 1, minHeight: 44, padding: '10px 14px' }}
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="cyber-button-yellow"
            style={{ flex: 1, minHeight: 44, padding: '10px 14px' }}
          >
            {isSaving ? 'Zapisywanie…' : 'Tak, zapisz'}
          </button>
        </div>
      }
    >
      <p style={{ ...FONT.monoSmall, color: 'var(--co-text)', margin: '0 0 10px', lineHeight: 1.6 }}>
        Zapisać <strong style={{ color: 'var(--co-green)' }}>{formatAmountShort(debt)} zł</strong> jako wpłatę od {playerName}?
      </p>
      <p style={{ ...FONT.monoMicro, color: 'var(--co-dim)', margin: 0, lineHeight: 1.6 }}>
        To tylko odhaczenie w aplikacji — przelew na telefon BLIK zrobisz w banku na numer {BLIK_NUMBER}.
      </p>
      {errorMsg && (
        <p role="alert" style={{ ...FONT.monoMicro, color: 'var(--co-rose)', margin: '10px 0 0', lineHeight: 1.6 }}>
          {errorMsg}
        </p>
      )}
    </Modal>
  );
}
