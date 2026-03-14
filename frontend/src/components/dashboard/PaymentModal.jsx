import { CheckCircle2, X } from 'lucide-react';
import { formatAmountShort } from '../../utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';

/**
 * Payment modal — custom amount only.
 * The exact-amount payment now goes directly via the card button (no modal).
 *
 * Props:
 *   type        — PAYMENT_MODAL.CUSTOM | null  (EXACT is handled inline on the card)
 *   debt        — player's current debt
 *   hasCredit   — true if player is in credit (changes label)
 *   customAmt   — controlled string value for the input
 *   onAmtChange — (value: string) => void
 *   onSave      — (amount: number) => void
 *   onCancel    — () => void
 *   isSaving    — disables buttons while saving
 *   tokens      — theme token object from useThemeTokens()
 */
export default function PaymentModal({ type, debt, hasCredit, customAmt, onAmtChange, onSave, onCancel, isSaving, tokens }) {
  if (!type) return null;

  const parsedAmt  = parseFloat(customAmt);
  const isValid    = !isNaN(parsedAmt) && parsedAmt > 0;
  const showError  = customAmt !== '' && !isValid;

  const cancelButton = (
    <button
      onClick={onCancel}
      className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-all"
      style={{ border: `2px solid ${tokens.cancelBorder}`, color: tokens.cancelText }}
    >
      <X size={14} /> Anuluj
    </button>
  );

  return (
    <div
      className="mb-3 rounded-xl p-4"
      style={{ background: tokens.modalBg, border: `2px solid ${tokens.accentBorder}`, boxShadow: tokens.modalShadow }}
    >
      <p className="font-bold text-center mb-3" style={{ color: tokens.accentText }}>
        {hasCredit ? 'Ile chcesz dopłacić?' : 'Wpisz kwotę przelewu BLIK'}
      </p>
      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder="np. 50"
        value={customAmt}
        onChange={e => onAmtChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && isValid) onSave(parsedAmt); }}
        autoFocus
        className="cyber-input w-full p-3 rounded-lg text-lg text-center mb-1 font-bold"
        style={{
          background:  tokens.inputBg,
          border:      `1px solid ${showError ? '#f87171' : tokens.inputBorder}`,
          color:       tokens.inputText,
          boxShadow:   showError ? '0 0 8px rgba(248,113,113,0.3)' : undefined,
        }}
      />
      {showError && (
        <p className="text-xs text-rose-400 font-bold text-center mb-2">
          Kwota musi być większa od 0
        </p>
      )}
      {!showError && <div className="mb-2" />}
      <div className="flex gap-2">
        <button
          onClick={() => { if (isValid) onSave(parsedAmt); }}
          disabled={isSaving || !isValid}
          className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-40 transition-all"
          style={{ background: tokens.confirmBg, border: `2px solid ${tokens.confirmBorder}`, color: tokens.confirmText }}
        >
          {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={14} /> Potwierdzam</>}
        </button>
        {cancelButton}
      </div>
    </div>
  );
}
