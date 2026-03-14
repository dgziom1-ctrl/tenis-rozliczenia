import { HandCoins, CheckCircle2, X } from 'lucide-react';
import { formatAmountShort } from '../../utils/format';

export default function SettleConfirmModal({ playerName, debt, onConfirm, onCancel, tokens }) {
  if (!playerName) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      style={{ background: tokens.overlayBg }}
    >
      <div
        className="p-6 w-full max-w-sm"
        style={{
          background:   tokens.modalBg,
          border:       `2px solid ${tokens.accentBorder}`,
          borderRadius: tokens.modalRadius,
          boxShadow:    tokens.modalShadow,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <HandCoins style={{ color: tokens.accentColor }} className="flex-shrink-0" size={24} />
          <h3
            className="font-black text-lg"
            style={{ color: tokens.accentColor, fontFamily: tokens.fontFamily, fontSize: tokens.fontSize }}
          >
            Potwierdzenie
          </h3>
        </div>

        <p className="text-sm mb-2" style={{ color: tokens.bodyText }}>
          <span className="font-black">{playerName}</span> zapłacił?
        </p>

        <div
          className="rounded-xl p-3 mb-5 text-center"
          style={{ background: tokens.accentBg, border: `1px solid ${tokens.accentBorder}` }}
        >
          <span className="text-3xl font-black" style={{ color: tokens.accentColor }}>
            {formatAmountShort(debt)} zł
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
            style={{
              border:       `2px solid ${tokens.accentBorder}`,
              color:        tokens.accentColor,
              background:   tokens.accentBg,
              borderRadius: tokens.modalRadius,
            }}
          >
            <CheckCircle2 size={15} /> Tak
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
            style={{
              border:       `2px solid ${tokens.cancelBorder}`,
              color:        tokens.cancelText,
              borderRadius: tokens.modalRadius,
            }}
          >
            <X size={15} /> ANULUJ
          </button>
        </div>
      </div>
    </div>
  );
}
