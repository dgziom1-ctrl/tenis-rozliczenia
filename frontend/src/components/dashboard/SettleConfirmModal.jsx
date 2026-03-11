import { HandCoins, CheckCircle2, X } from 'lucide-react';
import { formatAmountShort } from '../../utils/format';

export default function SettleConfirmModal({ playerName, debt, onConfirm, onCancel, T }) {
  if (!playerName) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      style={{ background: T.overlayBg }}
    >
      <div
        className="p-6 w-full max-w-sm"
        style={{
          background:   T.modalBg,
          border:       `2px solid ${T.accentBorder}`,
          borderRadius: T.modalRadius,
          boxShadow:    T.modalShadow,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <HandCoins style={{ color: T.accentColor }} className="flex-shrink-0" size={24} />
          <h3
            className="font-black text-lg"
            style={{ color: T.accentColor, fontFamily: T.fontFamily, fontSize: T.fontSize }}
          >
            Potwierdzenie
          </h3>
        </div>

        <p className="text-sm mb-2" style={{ color: T.bodyText }}>
          <span className="font-black">{playerName}</span> zapłacił?
        </p>

        <div
          className="rounded-xl p-3 mb-5 text-center"
          style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}
        >
          <span className="text-3xl font-black" style={{ color: T.accentColor }}>
            {formatAmountShort(debt)} zł
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
            style={{
              border:       `2px solid ${T.accentBorder}`,
              color:        T.accentColor,
              background:   T.accentBg,
              borderRadius: T.modalRadius,
            }}
          >
            <CheckCircle2 size={15} /> Tak
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-all"
            style={{
              border:       `2px solid ${T.cancelBorder}`,
              color:        T.cancelText,
              borderRadius: T.modalRadius,
            }}
          >
            <X size={15} /> ANULUJ
          </button>
        </div>
      </div>
    </div>
  );
}
