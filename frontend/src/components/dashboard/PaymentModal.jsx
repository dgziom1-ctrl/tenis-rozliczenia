import { CheckCircle2, X, Zap } from 'lucide-react';
import { formatAmountShort } from '../../utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';

export default function PaymentModal({ type, debt, hasCredit, customAmt, onAmtChange, onSave, onCancel, isSaving, tokens }) {
  if (!type) return null;

  const parsedAmt = parseFloat(customAmt);
  const isValid   = !isNaN(parsedAmt) && parsedAmt > 0;
  const showError = customAmt !== '' && !isValid;

  return (
    <div style={{
      marginBottom: 12, padding: '16px 14px',
      background: '#08080d',
      border: '1px solid rgba(0,229,255,0.25)',
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      boxShadow: '0 0 20px rgba(0,229,255,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={12} style={{ color: 'var(--co-cyan)', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.18em', color: 'var(--co-cyan)', textTransform: 'uppercase', margin: 0 }}>
          {hasCredit ? 'Ile chcesz dopłacić?' : 'Kwota przelewu BLIK'}
        </p>
      </div>

      {/* Amount input */}
      <input
        type="number" step="0.01" min="0.01"
        placeholder="np. 50"
        value={customAmt}
        onChange={e => onAmtChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && isValid) onSave(parsedAmt); }}
        autoFocus
        className="cyber-input"
        style={{
          width: '100%', padding: '12px 14px',
          fontSize: '1.3rem', textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          marginBottom: showError ? 4 : 12,
          border: `1px solid ${showError ? 'var(--co-yellow)' : '#2a2a2a'}`,
          boxShadow: showError ? '0 0 10px rgba(255,229,0,0.2)' : 'none',
          clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        }}
      />

      {showError && (
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-yellow)', textAlign: 'center', marginBottom: 8 }}>
          ⚠ KWOTA MUSI BYĆ WIĘKSZA OD 0
        </p>
      )}
      {!showError && customAmt === '' && (
        <div style={{ marginBottom: 0 }} />
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => { if (isValid) onSave(parsedAmt); }}
          disabled={isSaving || !isValid}
          className={isValid && !isSaving ? 'cyber-button-yellow' : ''}
          style={{
            flex: 1, padding: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: '0.62rem', letterSpacing: '0.1em',
            ...(!isValid || isSaving ? {
              background: 'var(--co-panel)', border: '1px solid #1a1a2e', color: '#333',
              cursor: 'not-allowed', fontFamily: 'var(--font-display)', fontWeight: 700,
            } : {}),
          }}
        >
          {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={13} /> Potwierdzam</>}
        </button>
        <button onClick={onCancel} className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <X size={13} /> ANULUJ
        </button>
      </div>
    </div>
  );
}
