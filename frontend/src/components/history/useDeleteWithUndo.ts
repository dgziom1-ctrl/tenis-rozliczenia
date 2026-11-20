import { useCallback, useRef } from 'react';
import { deleteWeekWithSnapshot, restoreWeek } from '@/lib/firebase';
import { useToast } from '../common/Toast';
import { useUndoTimer } from '@/hooks/useUndoTimer';
import { SOUND_TYPES } from '@/constants';
import type { Week } from '@/types/domain';
import type { SoundType } from '@/types/ui';

interface PendingDeletedWeek {
  week: Week;
  token: number;
  /** Wcześniejsze usunięcia, które też da się jeszcze cofnąć (najstarsze pierwsze). */
  earlier: Week[];
}

/**
 * Usuwanie sesji z oknem cofania. Kolejne usunięcia w oknie cofania układają się
 * na stosie, więc drugie nie kasuje możliwości cofnięcia pierwszego.
 */
export function useDeleteWithUndo(playSound: (type: SoundType) => void) {
  const { showError, showSuccess } = useToast();
  const { undoToast, progressPct, startUndo, dismissUndo } = useUndoTimer<PendingDeletedWeek>();

  // Ref blokują zapis, zanim stan zdąży się przerysować — chroni przed dwoma
  // szybkimi kliknięciami w ten sam przycisk.
  const deletingRef = useRef(false);
  const undoingRef = useRef(false);
  const undoSequenceRef = useRef(0);
  const activeUndoTokenRef = useRef<number | null>(null);
  const undoToastRef = useRef<typeof undoToast>(null);
  undoToastRef.current = undoToast;

  const handleDelete = useCallback(async (id: string) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    try {
      const result = await deleteWeekWithSnapshot(id);
      if (!result.success) {
        playSound(SOUND_TYPES.ERROR);
        showError(result.error || 'Nie udało się usunąć sesji');
        return;
      }
      if (result.deletedWeek) {
        const token = ++undoSequenceRef.current;
        activeUndoTokenRef.current = token;
        // Drugie usunięcie w oknie cofania nie może kasować możliwości cofnięcia
        // pierwszego — poprzednie sesje trafiają na stos.
        const previous = undoToastRef.current?.payload;
        const earlier = previous ? [...previous.earlier, previous.week] : [];
        startUndo({ week: result.deletedWeek, token, earlier });
      }
      playSound(SOUND_TYPES.DELETE);
    } catch {
      playSound(SOUND_TYPES.ERROR);
      showError('Nie udało się usunąć sesji');
    } finally {
      deletingRef.current = false;
    }
  }, [playSound, showError, startUndo]);

  const handleUndoDelete = useCallback(async () => {
    if (!undoToast || undoingRef.current) return;
    undoingRef.current = true;
    try {
      const { week, token, earlier } = undoToast.payload;
      const result = await restoreWeek(week);
      if (!result.success) {
        playSound(SOUND_TYPES.ERROR);
        showError(result.error || 'Nie udało się przywrócić sesji');
        return;
      }
      if (activeUndoTokenRef.current === token) {
        if (earlier.length > 0) {
          // Po cofnięciu ostatniego usunięcia wraca opcja cofnięcia poprzedniego.
          const nextToken = ++undoSequenceRef.current;
          activeUndoTokenRef.current = nextToken;
          startUndo({ week: earlier[earlier.length - 1], token: nextToken, earlier: earlier.slice(0, -1) });
        } else {
          activeUndoTokenRef.current = null;
          dismissUndo();
        }
      }
      playSound(SOUND_TYPES.SUCCESS);
      showSuccess('Sesja przywrócona');
    } catch {
      playSound(SOUND_TYPES.ERROR);
      showError('Nie udało się przywrócić sesji');
    } finally {
      undoingRef.current = false;
    }
  }, [undoToast, dismissUndo, startUndo, playSound, showError, showSuccess]);

  return { undoToast, progressPct, handleDelete, handleUndoDelete };
}
