import { CheckCircle2, X } from 'lucide-react';
import { PAYMENT_MODAL } from '../../constants';
import { formatAmountShort } from '../../utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';

/**
 * Payment confirmation modal for BLIK transfers.
 *
 * type === PAYMENT_MODAL.EXACT  — confirms the exact debt amount
 * type === PAYMENT_MODAL.CUSTOM — lets the player enter any amount
 *
 * Props:
 *   type        — PAYMENT_MODAL.EXACT | PAYMENT_MODAL.CUSTOM | null
 *   debt        — player's current debt (used in EXACT mode)
 *   hasCredit   — true if player is in credit (changes CUSTOM label)
 *   customAmt   — controlled string value for the custom input
 *   onAmtChange — (value: string) => void
 *   onSave      — (amount: number) => void
 *   onCancel    — () => void
 *   isSaving    — disables buttons while saving
 *   tokens      — theme token object from useThemeTokens()
 */
export default function PaymentModal({ type, debt, hasCredit, customAmt, onAmtChange, onSave, onCancel, isSaving, tokens }) {
  if (!type) return null;

  const confirmButton = (amount) => (
    <button
      onClick={() => onSave(amount)}
      disabled={isSaving}
      className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-40 transition-all"
      style={{ background: tokens.confirmBg, border: `2px solid ${tokens.confirmBorder}`, color: tokens.confirmText }}
    >
      {isSaving ? <InlineSpinner size="sm" /> : <><CheckCircle2 size={14} /> Tak, wysłałem</>}
    </button>
  );

  const cancelButton = (
    <button
      onClick={onCancel}
      className="flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-all"
      style={{ border: `2px solid ${tokens.cancelBorder}`, color: tokens.cancelText }}
    >
      <X size={14} /> Anuluj
    </button>
  );

  if (type === PAYMENT_MODAL.EXACT) {
    return (
      <div
        className="mb-3 rounded-xl p-4"
        style={{ background: tokens.accentBg, border: `2px solid ${tokens.accentBorder}` }}
      >
        <p className="font-bold text-center mb-1" style={{ color: tokens.bodyText }}>Potwierdzasz przelew?</p>
        <p className="text-2xl font-black text-center mb-4" style={{ color: tokens.accentText }}>
          {formatAmountShort(debt)} zł 💸
        </p>
        <div className="flex gap-2">
          {confirmButton(debt)}
          {cancelButton}
        </div>
      </div>
    );
  }

  const parsedAmt = parseFloat(customAmt);
  const isValid   = parsedAmt && parsedAmt !== 0;

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
        placeholder="np. 50"
        value={customAmt}
        onChange={e => onAmtChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && isValid) onSave(parsedAmt); }}
        autoFocus
        className="cyber-input w-full p-3 rounded-lg text-lg text-center mb-3 font-bold"
        style={{ background: tokens.inputBg, border: `1px solid ${tokens.inputBorder}`, color: tokens.inputText }}
      />
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
