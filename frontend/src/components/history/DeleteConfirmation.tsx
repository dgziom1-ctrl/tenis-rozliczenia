import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { formatDate } from '@/utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';
import type { HistoryEntry } from '../../types/ui';

interface DeleteConfirmationProps {
  row: HistoryEntry;
  isDeleting: boolean;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}

/**
 * Potwierdzenie rozwijane w miejscu wiersza, nie osobne okno — pytanie zostaje
 * przy sesji, której dotyczy. Escape mimo to zamyka, bo użytkownik oczekuje
 * tego od każdego potwierdzenia.
 */
export default function DeleteConfirmation({ row, isDeleting, onConfirm, onCancel }: DeleteConfirmationProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDeleting) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, isDeleting]);

  return (
    <div role="group" aria-label="Potwierdzenie usunięcia sesji" style={{
      background: 'var(--co-tint-rose)',
      border: '1px solid var(--co-rose)',
      clipPath: CLIP.smallCard,
      padding: 16, marginBottom: 4,
      boxShadow: 'var(--glow-box-rose)',
    }}>
      {/* Pytanie było mniejsze (0.6rem) od własnego objaśnienia (0.65rem) —
          odwrócona hierarchia na akcji nieodwracalnej. */}
      <p style={{ ...FONT.display(TEXT.lead, TRACK.normal), color: 'var(--co-rose)', margin: '0 0 6px' }}>
        ⚠ Usunąć sesję z dnia {formatDate(row.datePlayed)}?
      </p>
      <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', margin: '0 0 14px' }}>
        Tej operacji nie można cofnąć. Salda graczy zostaną przeliczone.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => onConfirm(row.id)}
          disabled={isDeleting}
          className="cyber-button-danger"
          style={{ flex: 1, minHeight: 44, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {isDeleting
            ? <><InlineSpinner size="sm" /> USUWAM…</>
            : <><Trash2 size={14} aria-hidden="true" /> USUŃ</>}
        </button>
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="cyber-button-outline"
          style={{ flex: 1, minHeight: 44, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <X size={14} aria-hidden="true" /> ANULUJ
        </button>
      </div>
    </div>
  );
}
