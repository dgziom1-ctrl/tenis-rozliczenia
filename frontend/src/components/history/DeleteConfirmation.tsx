import { Trash2, X } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';
import type { HistoryEntry } from '../../types/ui';

interface DeleteConfirmationProps {
  row: HistoryEntry;
  isDeleting: boolean;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

export default function DeleteConfirmation({ row, isDeleting, onConfirm, onCancel }: DeleteConfirmationProps) {
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
        Tej operacji nie można cofnąć. Salda graczy zostaną przeliczone.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onConfirm(row.id)} disabled={isDeleting}
          style={{
            flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: isDeleting ? 'var(--co-panel)' : 'var(--co-rose)',
            color: isDeleting ? 'var(--co-dim)' : '#000',
            fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.12em',
            border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          }}>
          {isDeleting
            ? <><InlineSpinner size="sm" /> USUWAM...</>
            : <><Trash2 size={14} /> POTWIERDŹ USUNIĘCIE</>}
        </button>
        <button onClick={onCancel} disabled={isDeleting}
          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>
          <X size={14} /> ANULUJ
        </button>
      </div>
    </div>
  );
}
