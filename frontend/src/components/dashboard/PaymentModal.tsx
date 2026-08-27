import { useRef, useEffect, useId } from 'react';
import { CheckCircle2, X, Zap } from 'lucide-react';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { parseAmount, isValidAmount } from '@/utils/format';
import type { PAYMENT_MODAL } from '@/constants';
import { TEXT, CLIP } from '@/constants/styles';

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

export default function PaymentModal({ type, hasCredit, customAmt, onAmtChange, onSave, onCancel, isSaving, errorMsg = null }: PaymentModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();

  useFocusTrap(panelRef, type !== null);
  useEffect(() => { panelRef.current?.focus(); }, []);

  if (!type) return null;

  const parsedAmt = parseAmount(customAmt);
  const isValid   = isValidAmount(parsedAmt, 0.01);
  const showError = customAmt !== '' && !isValid;

  const handleBlur = () => {
    const parsed = parseAmount(customAmt);
    if (customAmt !== '' && Number.isFinite(parsed)) {
      onAmtChange(parsed.toFixed(2));
    }
  };

  return (
    <div ref={panelRef} tabIndex={-1} onKeyDown={e => e.key === 'Escape' && onCancel()} role="dialog" aria-modal="true" aria-labelledby={titleId} style={{
      marginBottom: 12, padding: '16px 14px',
      background: 'var(--co-dark)',
      border: '1px solid var(--co-tint-line)',
      clipPath: CLIP.card,
      boxShadow: 'var(--glow-box-cyan)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={12} style={{ color: 'var(--co-cyan)', flexShrink: 0 }} />
        <p id={titleId} style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.18em', color: 'var(--co-cyan)', textTransform: 'uppercase', margin: 0 }}>
          {hasCredit ? 'Ile chcesz dopłacić?' : 'Kwota przelewu BLIK'}
        </p>
      </div>

      {/* Amount input */}
      <label htmlFor={inputId} className="sr-only">Kwota w złotych</label>
      <input
        id={inputId}
        type="text" inputMode="decimal"
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
          marginBottom: showError ? 4 : 12,
          clipPath: CLIP.tag,
        }}
      />

      {showError && (
        <p id={errorId} role="alert" style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-rose)', textAlign: 'center', marginBottom: 8 }}>
          ⚠ {customAmt !== '' && parsedAmt > 0 && parsedAmt < 0.01 ? 'Minimalna kwota to 0.01 zł' : 'KWOTA MUSI BYĆ WIĘKSZA OD 0'}
        </p>
      )}

      {errorMsg && !showError && (
        <p id={errorId} role="alert" style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-rose)', textAlign: 'center', marginBottom: 8 }}>
          ⚠ {errorMsg}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { if (isValid) onSave(parsedAmt); }}
          disabled={isSaving || !isValid}
          className={isValid && !isSaving ? 'cyber-button-yellow' : ''}
          style={{
            flex: 1, padding: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: '0.75rem', letterSpacing: '0.1em',
            ...(!isValid || isSaving ? {
              background: 'var(--co-panel)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
              cursor: 'not-allowed', fontFamily: 'var(--font-display)', 
            } : {}),
          }}
        >
          {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={13} /> Potwierdzam</>}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="cyber-button-outline"
          style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: isSaving ? 0.65 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
        >
          <X size={13} /> ANULUJ
        </button>
      </div>
    </div>
  );
}
