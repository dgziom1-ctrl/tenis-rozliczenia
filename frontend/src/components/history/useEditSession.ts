import { useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { updateWeek } from '@/lib/firebase';
import { useToast } from '../common/Toast';
import { parseAmount, isValidAmount } from '@/utils/format';
import { getRacketSelection, getTotalWithRackets } from '@/utils/sessionCost';
import { buildEditForm } from '@/utils/editForm';
import { costError } from '@/utils/costMessages';
import { grossError, resolveEditRefund } from '@/utils/courtRefund';
import { SPORT, RACKET_PRICE } from '@/constants';
import type { HistoryEntry, SessionEditForm } from '@/types/ui';

/** Edytowana sesja razem z jej identyfikatorem — jedno albo drugie nigdy nie występuje osobno. */
interface EditState {
  id: string;
  form: SessionEditForm;
  /** Migawka formularza z chwili otwarcia — do wykrycia niezapisanych zmian. */
  initial: string;
}

const DISCARD_PROMPT = 'Masz niezapisane zmiany w edytowanej sesji. Odrzucić je?';

/**
 * Edycja zapisanej sesji: formularz, walidacja kwoty, wykrywanie niezapisanych
 * zmian, zapis i przełączanie graczy oraz kart.
 *
 * @param singleScanPlayers gracze z kartą jednorazową (Medicover) — karta dodana
 *   przy edycji dostaje bieżącą cechę gracza.
 */
export function useEditSession(singleScanPlayers: readonly string[]) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showError, showSuccess } = useToast();

  // Ref blokuje zapis, zanim stan zdąży się przerysować — chroni przed dwoma
  // szybkimi kliknięciami w ten sam przycisk.
  const savingRef = useRef(false);

  const editForm = editing?.form;
  // Sesje z nowym sposobem wpisywania liczą kwotę kortu z ceny i zwrotu;
  // starsze zostają przy jednym polu „koszt kortu po zwrotach”.
  const editRefund = editForm ? resolveEditRefund(editForm) : null;
  const parsedEditCost = editRefund ? (editRefund.net ?? 0) : parseAmount(editForm?.cost ?? '');
  const isEditCostValid = editRefund ? editRefund.net !== null : isValidAmount(parsedEditCost, 0);
  const editCostError = isEditCostValid
    ? null
    : editRefund
      ? (grossError(editForm?.courtGross) ?? editRefund.error)
      : costError(String(editForm?.cost ?? ''));
  const isEditDirty = editing !== null && JSON.stringify(editing.form) !== editing.initial;

  // Otwarcie edycji innego wiersza podmienia formularz, więc przy zmianach
  // pytamy, zanim je stracimy.
  const isEditDirtyRef = useRef(false);
  isEditDirtyRef.current = isEditDirty;
  /** `true`, gdy można porzucić bieżący formularz: nie ma zmian albo użytkownik się zgodził. */
  const confirmDiscard = useCallback(
    () => !isEditDirtyRef.current || window.confirm(DISCARD_PROMPT),
    [],
  );

  const startEdit = useCallback((row: HistoryEntry) => {
    const form = buildEditForm(row);
    setEditing({ id: row.id, form, initial: JSON.stringify(form) });
  }, []);

  const cancelEdit = useCallback(() => {
    if (!confirmDiscard()) return;
    setEditing(null);
  }, [confirmDiscard]);

  /** Aktualizuje wyłącznie formularz, zachowując identyfikator edytowanej sesji. */
  const setEditForm = useCallback<Dispatch<SetStateAction<SessionEditForm>>>(update => {
    setEditing(prev => {
      if (!prev) return prev;
      return { ...prev, form: typeof update === 'function' ? update(prev.form) : update };
    });
  }, []);

  const saveEdit = async () => {
    if (savingRef.current || !editing) return;
    if (!isEditCostValid) {
      showError(editCostError || 'Nieprawidłowy koszt');
      return;
    }
    if ((editing.form.present ?? []).length === 0) {
      showError('Zaznacz co najmniej jednego gracza');
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    const { id, form } = editing;
    const sport = form.sport || SPORT.PINGPONG;
    const ownRacketForSession = (form.ownRacketPlayers ?? []).filter(p => form.present.includes(p));
    const racketSelection = getRacketSelection(
      sport,
      form.present,
      ownRacketForSession,
      form.racketCount ?? 0,
      form.racketPrice ?? RACKET_PRICE,
    );
    try {
      const result = await updateWeek(id, {
        date: form.date,
        // W bazie trzymamy pełną kwotę sesji (kort + rakiety), a pole edycji
        // zawiera tylko kort — dokładnie jak w formularzu dodawania.
        cost: getTotalWithRackets(parsedEditCost, racketSelection.cost),
        present: form.present,
        multiPlayers: form.multiPlayers,
        sport,
        racketCost: racketSelection.cost,
        ownRacketPlayers: racketSelection.withRackets ? ownRacketForSession : [],
        // `undefined` dla starych sesji oznacza „bez limitu kart".
        courtCount: form.courtCount,
        durationHours: form.durationHours,
        singleScanPlayers: (form.singleScanPlayers ?? []).filter(p => form.multiPlayers.includes(p)),
        ...(editRefund?.gross != null ? { courtGross: editRefund.gross } : {}),
      });
      if (!result.success) { showError(result.error || 'Nie udało się zapisać sesji'); return; }
      showSuccess('Sesja zaktualizowana');
      setEditing(null);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const togglePresent = useCallback((name: string) => {
    setEditForm(prev => {
      const inList = (prev.present || []).includes(name);
      return {
        ...prev,
        present: inList ? prev.present.filter(p => p !== name) : [...prev.present, name],
        multiPlayers: inList ? (prev.multiPlayers || []).filter(p => p !== name) : prev.multiPlayers,
        ownRacketPlayers: inList ? (prev.ownRacketPlayers || []).filter(p => p !== name) : prev.ownRacketPlayers,
      };
    });
  }, [setEditForm]);

  const toggleMulti = useCallback((name: string) => {
    setEditForm(prev => {
      const inList = (prev.multiPlayers || []).includes(name);
      const single = prev.singleScanPlayers ?? [];
      // Karta dodana przy edycji dostaje bieżącą cechę gracza (Medicover albo
      // Multisport); zdjęta karta znika też z listy Medicover.
      const nextSingle = inList
        ? single.filter(p => p !== name)
        : singleScanPlayers.includes(name) && !single.includes(name) ? [...single, name] : single;
      return {
        ...prev,
        multiPlayers: inList ? prev.multiPlayers.filter(p => p !== name) : [...prev.multiPlayers, name],
        singleScanPlayers: nextSingle,
      };
    });
  }, [setEditForm, singleScanPlayers]);

  return {
    /** Formularz otwartej edycji albo `undefined`, gdy nic nie jest edytowane. */
    editForm,
    isSaving,
    isEditCostValid,
    editCostError,
    confirmDiscard,
    startEdit,
    cancelEdit,
    setEditForm,
    saveEdit,
    togglePresent,
    toggleMulti,
  };
}
