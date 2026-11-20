import { useId } from 'react';
import { CheckCircle2, X, Zap } from 'lucide-react';
import { InlineSpinner } from '../common/LoadingSkeleton';
import Modal from '../common/Modal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { parseAmount, isValidAmount } from '@/utils/format';
import { BLIK_NUMBER } from '@/utils/blik';
import type { PAYMENT_MODAL } from '@/constants';
import { TEXT, CLIP, FONT } from '@/constants/styles';

export type PaymentModalType = (typeof PAYMENT_MODAL)[keyof typeof PAYMENT_MODAL];

interface PaymentModalProps {
  type: PaymentModalType | null;
  hasCredit: boolean;
  customAmt: string;
  onAmtChange: (value: string) => void;
  onSave: (amount: number) => void;
  onCancel: () => void;
  isSaving: boolean;
  errorMsg?: string | null;
}

/**
 * Wpłata dowolnej kwoty. Wcześniej był to własny panel `role="dialog"` w
 * przepływie karty — bez tła, blokady przewijania i `inert`, więc fokus uciekał
 * na stronę, a Escape działał tylko wewnątrz. Teraz jedzie na wspólnym `Modal`
 * (portal, pułapka fokusu, Escape, safe-area, dolny arkusz na telefonie).
 */
export default function PaymentModal({ type, hasCredit, customAmt, onAmtChange, onSave, onCancel, isSaving, errorMsg = null }: PaymentModalProps) {
  const inputId = useId();
  const errorId = useId();
  const isMobile = useIsMobile();

  const parsedAmt = parseAmount(customAmt);
  const isValid   = isValidAmount(parsedAmt, 0.01);
  const showError = customAmt !== '' && !isValid;

  const handleBlur = () => {
    const parsed = parseAmount(customAmt);
    if (customAmt !== '' && Number.isFinite(parsed)) {
      onAmtChange(parsed.toFixed(2));
    }
  };

  const footer = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        onClick={() => { if (isValid) onSave(parsedAmt); }}
        disabled={isSaving || !isValid}
        className={isValid && !isSaving ? 'cyber-button-yellow' : ''}
        style={{
          flex: 1, padding: '10px', minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: '0.75rem', letterSpacing: 'normal',
          ...(!isValid || isSaving ? {
            background: 'var(--co-panel)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
            cursor: 'not-allowed', fontFamily: 'var(--font-display)',
          } : {}),
        }}
      >
        {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={13} /> Zapisz wpłatę</>}
      </button>
      <button
        onClick={onCancel}
        disabled={isSaving}
        className="cyber-button-outline"
        style={{ flex: 1, padding: '10px', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isSaving ? 0.65 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
      >
        <X size={13} /> Anuluj
      </button>
    </div>
  );

  return (
    <Modal
      open={type !== null}
      onClose={onCancel}
      title={hasCredit ? 'Ile chcesz dopłacić?' : 'Zapisz wpłatę'}
      icon={Zap}
      align={isMobile ? 'bottom' : 'center'}
      maxWidth={420}
      footer={footer}
    >
      <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', lineHeight: 1.55, margin: '0 0 12px' }}>
        To tylko odhaczenie w aplikacji — przelew na telefon BLIK zrobisz w banku na numer {BLIK_NUMBER}.
      </p>

      <label htmlFor={inputId} className="sr-only">Kwota w złotych</label>
      <input
        id={inputId}
        type="text" inputMode="decimal"
        enterKeyHint="done"
        placeholder="np. 50"
        value={customAmt}
        onChange={e => onAmtChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter' && isValid && !isSaving) onSave(parsedAmt); }}
        autoFocus
        aria-invalid={showError}
        aria-describedby={showError || errorMsg ? errorId : undefined}
        className={`cyber-input ${showError ? 'input-error' : ''}`}
        style={{
          width: '100%', padding: '12px 14px',
          fontSize: TEXT.h3, textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          marginBottom: showError ? 4 : 0,
          clipPath: CLIP.tag,
        }}
      />

      {showError && (
        <p id={errorId} role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', textAlign: 'center', margin: '4px 0 0' }}>
          ⚠ {customAmt !== '' && parsedAmt > 0 && parsedAmt < 0.01 ? 'Minimalna kwota to 0,01 zł' : 'Kwota musi być większa od 0'}
        </p>
      )}

      {errorMsg && !showError && (
        <p id={errorId} role="alert" style={{ ...FONT.display(TEXT.base), color: 'var(--co-rose)', textAlign: 'center', margin: '8px 0 0' }}>
          ⚠ {errorMsg}
        </p>
      )}
    </Modal>
  );
}
