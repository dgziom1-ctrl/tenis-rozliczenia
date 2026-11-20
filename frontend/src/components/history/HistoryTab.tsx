import { useState, useCallback, useRef } from 'react';
import { Terminal, CalendarDays, Pencil } from 'lucide-react';
import { updateWeek } from '@/lib/firebase';
import SeasonSelector from '../attendance/SeasonSelector';
import { parseAmount, isValidAmount, formatDate, plural } from '@/utils/format';
import { getRacketSelection, getTotalWithRackets } from '@/utils/sessionCost';
import { buildEditForm } from '@/utils/editForm';
import { costError } from '@/utils/costMessages';
import { grossError, resolveEditRefund } from '@/utils/courtRefund';
import { buildSessionsCsv, downloadCsv, safeFileName } from '@/utils/csv';
import { track } from '@/lib/analytics/track';
import { useToast } from '../common/Toast';
import { PasswordModal, PanelHeader } from '../common/SharedUI';
import UndoBar from '../common/UndoBar';
import Modal from '../common/Modal';
import { SPORT, RACKET_PRICE, UNDO_TIMEOUT_SECONDS } from '@/constants';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { HistoryEntry, SoundType, SessionEditForm } from '../../types/ui';
import LogEntry from './LogEntry';
import AttendanceTrendChart from './AttendanceTrendChart';
import EditSessionForm from './EditSessionForm';
import PlayerFilterSheet from './PlayerFilterSheet';
import HistoryFilterBar from './HistoryFilterBar';
import { useHistoryFilters, SESSIONS_PAGE_SIZE } from './useHistoryFilters';
import { useDeleteWithUndo } from './useDeleteWithUndo';
import { CLIP, FONT, TEXT } from '@/constants/styles';

/** Edytowana sesja razem z jej identyfikatorem — jedno albo drugie nigdy nie występuje osobno. */
interface EditState {
  id: string;
  form: SessionEditForm;
  /** Migawka formularza z chwili otwarcia — do wykrycia niezapisanych zmian. */
  initial: string;
}

const DISCARD_PROMPT = 'Masz niezapisane zmiany w edytowanej sesji. Odrzucić je?';

interface HistoryTabProps {
  history: HistoryEntry[];
  playerNames: string[];
  /** Gracze z kartą jednorazową (Medicover) — dla kart dodanych przy edycji. */
  singleScanPlayers?: string[];
  playSound: (type: SoundType) => void;
}

const NO_PLAYERS: string[] = [];

export default function HistoryTab({ history, playerNames, singleScanPlayers = NO_PLAYERS, playSound }: HistoryTabProps) {
  const [editing,      setEditing]      = useState<EditState | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [pwModal,      setPwModal]      = useState<{ type: 'edit'; row: HistoryEntry } | { type: 'delete'; rowId: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const {
    filterPlayer, setFilterPlayer, filterSport, setFilterSport, searchQuery, setSearchQuery,
    sortOrder, toggleSort, seasons, selectedSeason, setChosenSeason,
    seasonHistory, filteredHistory, visibleHistory, hasMoreSessions, grouped, showMore,
  } = useHistoryFilters(history);
  const { showError, showSuccess } = useToast();
  const { undoToast, progressPct, handleDelete, handleUndoDelete } = useDeleteWithUndo(playSound);
  const isMobile = useIsMobile();

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

  const handleExportCSV = () => {
    try {
      const fileName = filterPlayer ? `sesje_${safeFileName(filterPlayer)}.csv` : 'sesje.csv';
      downloadCsv(fileName, buildSessionsCsv(filteredHistory));
      track('csv_export', { rows: filteredHistory.length, filtered: Boolean(filterPlayer) });
      showSuccess(`Wyeksportowano ${filteredHistory.length} sesji`);
    } catch (err) {
      console.warn('CSV export failed:', err);
      showError('Nie udało się wyeksportować pliku CSV');
    }
  };

  // Otwarcie edycji innego wiersza podmienia formularz, więc przy zmianach
  // pytamy, zanim je stracimy.
  const isEditDirtyRef = useRef(false);
  isEditDirtyRef.current = isEditDirty;
  const requestEdit   = useCallback((row: HistoryEntry) => {
    if (isEditDirtyRef.current && !window.confirm(DISCARD_PROMPT)) return;
    setPwModal({ type: 'edit', row });
  }, []);
  const requestDelete = useCallback((id: string) => setPwModal({ type: 'delete', rowId: id }), []);

  const handlePasswordConfirm = () => {
    if (!pwModal) return;
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      const form = buildEditForm(row);
      setEditing({ id: row.id, form, initial: JSON.stringify(form) });
    } else {
      void handleDelete(pwModal.rowId);
    }
    setPwModal(null);
  };

  const cancelEdit = useCallback(() => {
    if (isEditDirtyRef.current && !window.confirm(DISCARD_PROMPT)) return;
    setEditing(null);
  }, []);

  /** Aktualizuje wyłącznie formularz, zachowując identyfikator edytowanej sesji. */
  const setEditForm = useCallback<React.Dispatch<React.SetStateAction<SessionEditForm>>>(update => {
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

  return (
    <>
      {pwModal && (
        <PasswordModal
          action={pwModal.type === 'edit' ? 'Podaj hasło, aby edytować sesję.' : `Podaj hasło, aby usunąć sesję. Przez ${UNDO_TIMEOUT_SECONDS} s można ją cofnąć.`}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPwModal(null)}
          playSound={playSound}
        />
      )}

      {/* Edycja w oknie zamiast inline w liście: jeden punkt zapisu/odrzucenia,
          pułapka fokusu, Escape i brak skoku listy po otwarciu. Zamknięcie
          (Escape, „Anuluj”) przechodzi przez pytanie o niezapisane zmiany. */}
      <Modal
        open={editing !== null}
        onClose={cancelEdit}
        title="Edytuj sesję"
        icon={Pencil}
        align={isMobile ? 'bottom' : 'center'}
        maxWidth={560}
        closeOnBackdrop={false}
      >
        {editing && (
          <EditSessionForm
            editForm={editing.form}
            setEditForm={setEditForm}
            playerNames={playerNames}
            isSaving={isSaving}
            isEditCostValid={isEditCostValid}
            editCostError={editCostError}
            onSave={saveEdit}
            onCancel={cancelEdit}
            onTogglePresent={togglePresent}
            onToggleMulti={toggleMulti}
          />
        )}
      </Modal>

      <PlayerFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        playerNames={playerNames}
        filterPlayer={filterPlayer}
        onSelect={setFilterPlayer}
      />

      {undoToast && (
        <div style={{ marginBottom: 12 }}>
          <UndoBar
            message={<>
              Sesja z {formatDate(undoToast.payload.week.date)} usunięta
              {undoToast.payload.earlier.length > 0 && ` (+${undoToast.payload.earlier.length} wcześniejsze do cofnięcia)`}
            </>}
            secondsLeft={undoToast.secondsLeft}
            progressPct={progressPct}
            onUndo={() => { void handleUndoDelete(); }}
          />
        </div>
      )}

      <div className="cyber-box" style={{
        clipPath: CLIP.panel,
        padding: '20px 16px',
        animation: 'slide-in-up 0.3s ease-out',
      }}>

        {/* ── 1. HEADER ─────────────────────────────────────────────── */}
        <PanelHeader
          icon={Terminal}
          title="Historia"
          accent="var(--co-green)"
          aside={
            <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
              {filteredHistory.length}{selectedSeason || filterPlayer ? ` z ${history.length}` : ''} {plural(filteredHistory.length, 'rekord', 'rekordy', 'rekordów')}
            </span>
          }
        />

        {/* ── 2. WYKRES TRENDU ──────────────────────────────────────── */}
        {seasonHistory.length >= 2 && (
          <AttendanceTrendChart history={seasonHistory} />
        )}

        {seasons.length > 1 && (
          <SeasonSelector seasons={seasons} selected={selectedSeason} onChange={setChosenSeason} />
        )}

        {/* ── 4. PASEK KONTROLEK (filtr + sort + CSV) ─────────────── */}
        {history.length > 0 && (
          <HistoryFilterBar
            playerNames={playerNames}
            isMobile={isMobile}
            filterPlayer={filterPlayer}
            onFilterPlayer={setFilterPlayer}
            filterSport={filterSport}
            onFilterSport={setFilterSport}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            sortOrder={sortOrder}
            onToggleSort={toggleSort}
            matchCount={filteredHistory.length}
            onOpenPlayerSheet={() => setIsFilterOpen(true)}
            onExportCsv={handleExportCSV}
          />
        )}

        {/* ── 5. LICZNIK STRONY ─────────────────────────────────────── */}
        {filteredHistory.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap', margin: '0 0 16px',
          }}>
            <p aria-live="polite" style={{ margin: 0, ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
              Pokazano <span style={{ color: 'var(--co-cyan)' }}>{visibleHistory.length}</span> z {filteredHistory.length} sesji
            </p>
          </div>
        )}

        {/* ── 6. EMPTY STATE ────────────────────────────────────────── */}
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays style={{ margin: '0 auto 16px', color: 'var(--co-dim)' }} size={40} />
            <p style={{ ...FONT.display(TEXT.tiny), color: 'var(--co-dim)', textTransform: 'none' }}>
              Brak danych
            </p>
            <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', marginTop: 8 }}>
              Dodaj pierwszą sesję w zakładce Dodaj.
            </p>
          </div>
        )}

        {history.length > 0 && filteredHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)' }}>
              Brak sesji dla wybranych filtrów.
            </p>
          </div>
        )}

        {/* ── 6. LISTA SESJI ────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(({ label, rows }) => (
            <div key={label}>
              {/* Month header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: CLIP.tag }}>
                  <span style={{ ...FONT.display(TEXT.lead), color: 'var(--co-cyan)' }}>{label}</span>
                  <span style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)' }}>[{rows.length}x]</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--co-tint-line), transparent)' }} />
              </div>

              {/* Log entries */}
              <div>
                {rows.map((row) => (
                  <LogEntry key={row.id} row={row} onEdit={requestEdit} onDelete={requestDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Hover przez klasę, nie przez handlery JS — na dotyku `mouseenter`
            wypalał się przy tapnięciu i stan zostawał do kolejnego kliknięcia. */}
        {hasMoreSessions && (
          <button
            type="button"
            onClick={showMore}
            className="cyber-button-outline"
            style={{ display: 'block', width: '100%', marginTop: 16, minHeight: 44, padding: '12px' }}
          >
            Pokaż więcej ({filteredHistory.length - visibleHistory.length} pozostało)
          </button>
        )}
        {!hasMoreSessions && filteredHistory.length > SESSIONS_PAGE_SIZE && (
          <p style={{ margin: '16px 0 0', textAlign: 'center', ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
            To wszystkie sesje w tym widoku.
          </p>
        )}
      </div>
    </>
  );
}
