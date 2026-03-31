import { Trash2, X } from 'lucide-react';
import { formatDate } from '@/utils/format';
import type { HistoryEntry } from '../../types/ui';

interface DeleteConfirmationProps {
  row: HistoryEntry;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

export default function DeleteConfirmation({ row, onConfirm, onCancel }: DeleteConfirmationProps) {
  return (
    <div style={{
      background: 'rgba(255,32,144,0.04)', border: '1px solid rgba(255,32,144,0.35)',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
      padding: 16, marginBottom: 4,
      boxShadow: '0 0 20px rgba(255,32,144,0.1)',
    }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--co-rose)', marginBottom: 4, textTransform: 'uppercase' }}>
        ⚠ Usunąć sesję z dnia {formatDate(row.datePlayed)}?
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', marginBottom: 14 }}>
        Będziesz mieć 8 sekund na cofnięcie.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onConfirm(row.id)}
          style={{
            flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'var(--co-rose)', color: '#000',
            fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.12em',
            border: 'none', cursor: 'pointer',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          }}>
          <Trash2 size={14} /> POTWIERDŹ USUNIĘCIE
        </button>
        <button onClick={onCancel}
          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <X size={14} /> ANULUJ
        </button>
      </div>
    </div>
  );
}
