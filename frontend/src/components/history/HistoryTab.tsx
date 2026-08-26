import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Terminal, CalendarDays, Search, Download, ArrowUpDown } from 'lucide-react';
import { updateWeek, deleteWeek } from '@/lib/firebase';
import { groupHistoryByMonth } from '@/utils/sessions';
import { parseAmount, isValidAmount } from '@/utils/format';
import { useToast } from '../common/Toast';
import { PasswordModal, PanelHeader } from '../common/SharedUI';
import { SPORT, SPORT_LABEL } from '@/constants';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { HistoryEntry, SoundType, SessionEditForm } from '../../types/ui';
import LogEntry from './LogEntry';
import AttendanceTrendChart from './AttendanceTrendChart';
import EditSessionForm from './EditSessionForm';
import DeleteConfirmation from './DeleteConfirmation';
import PlayerFilterSheet from './PlayerFilterSheet';
import { CLIP } from '@/constants/styles';

/** Ile sesji pokazujemy, zanim użytkownik poprosi o pełną listę. */
const INITIAL_VISIBLE_SESSIONS = 50;

/** Edytowana sesja razem z jej identyfikatorem — jedno albo drugie nigdy nie występuje osobno. */
interface EditState {
  id: string;
  form: SessionEditForm;
}

interface HistoryTabProps {
  history: HistoryEntry[];
  playerNames: string[];
  playSound: (type: SoundType) => void;
}

export default function HistoryTab({ history, playerNames, playSound }: HistoryTabProps) {
  const [editing,      setEditing]      = useState<EditState | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [pwModal,      setPwModal]      = useState<{ type: 'edit'; row: HistoryEntry } | { type: 'delete'; rowId: string } | null>(null);
  const [filterPlayer, setFilterPlayer] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder,    setSortOrder]    = useState<'desc' | 'asc'>('desc');
  const [showAll,      setShowAll]      = useState(false);
  const { showError, showSuccess } = useToast();
  const isMobile = useIsMobile();

  // Stan blokuje dopiero po przerysowaniu, więc dwa kliknięcia w tym samym
  // ticku zdążyłyby wysłać dwa zapisy. Ref blokuje je natychmiast.
  const savingRef  = useRef(false);
  const deletingRef = useRef(false);

  const editForm = editing?.form;
  const parsedEditCost = parseAmount(editForm?.cost ?? '');
  const isEditCostValid = isValidAmount(parsedEditCost, 0);
  const editCostError = isEditCostValid
    ? null
    : (editForm?.cost === '' ? 'Wpisz koszt sesji' : 'Koszt musi być liczbą >= 0');

  const filteredHistory = useMemo(() => {
    const h = !filterPlayer ? history : history.filter(s => s.presentPlayers.includes(filterPlayer));
    return sortOrder === 'asc' ? [...h].reverse() : h;
  }, [history, filterPlayer, sortOrder]);

  useEffect(() => { setShowAll(false); }, [filterPlayer, sortOrder]);

  const handleExportCSV = () => {
    let url: string | undefined;
    try {
      const rows = [
        ['Data', 'Sport', 'Koszt całkowity', 'Koszt rakiet', 'Bez karty (zł/os.)', 'Z kartą (zł/os.)', 'Liczba graczy', 'Obecni', 'Multisport'],
        ...filteredHistory.map(s => [
          s.datePlayed,
          (SPORT_LABEL[s.sport] ?? 'Ping-Pong').toLowerCase(),
          s.totalCost,
          s.racketCost ?? 0,
          s.costPerPerson?.toFixed(2) ?? '',
          s.costPerPersonMulti?.toFixed(2) ?? '',
          s.presentPlayers.length,
          s.presentPlayers.join('; '),
          s.multisportPlayers.join('; '),
        ]),
      ];
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      url  = URL.createObjectURL(blob);
      const safeName = filterPlayer.replace(/[/\\:*?"<>|]/g, '_');
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: filterPlayer ? `sesje_${safeName}.csv` : 'sesje.csv',
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showSuccess(`Wyeksportowano ${filteredHistory.length} sesji`);
    } catch (err) {
      console.warn('CSV export failed:', err);
      showError('Nie udało się wyeksportować pliku CSV');
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const requestEdit   = useCallback((row: HistoryEntry) => setPwModal({ type: 'edit', row }), []);
  const requestDelete = useCallback((id: string) => setPwModal({ type: 'delete', rowId: id }), []);

  const handlePasswordConfirm = () => {
    if (!pwModal) return;
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      setEditing({
        id: row.id,
        form: {
          date: row.datePlayed,
          cost: row.totalCost,
          present: [...row.presentPlayers],
          multiPlayers: [...row.multisportPlayers],
          sport: row.sport || SPORT.PINGPONG,
          racketCost: row.racketCost,
          ownRacketPlayers: row.ownRacketPlayers ? [...row.ownRacketPlayers] : [],
        },
      });
    } else {
      setDeletingId(pwModal.rowId);
    }
    setPwModal(null);
  };

  const cancelEdit = useCallback(() => setEditing(null), []);

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
    savingRef.current = true;
    setIsSaving(true);
    const { id, form } = editing;
    try {
      const result = await updateWeek(id, {
        date: form.date,
        cost: parsedEditCost,
        present: form.present,
        multiPlayers: form.multiPlayers,
        sport: form.sport || SPORT.PINGPONG,
        racketCost: form.racketCost,
        ownRacketPlayers: form.ownRacketPlayers,
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
      return { ...prev, multiPlayers: inList ? prev.multiPlayers.filter(p => p !== name) : [...prev.multiPlayers, name] };
    });
  }, [setEditForm]);

  const handleDelete = async (id: string) => {
    // Usunięcie jest nieodwracalne — potwierdzenie znika dopiero PO zapisie,
    // a ref blokuje drugie kliknięcie, zanim stan zdąży się odświeżyć.
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    try {
      const result = await deleteWeek(id);
      if (!result.success) { showError(result.error || 'Nie udało się usunąć sesji'); return; }
      showSuccess('Sesja usunięta');
      setDeletingId(null);
    } catch { showError('Nie udało się usunąć sesji'); }
    finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  };

  const visibleHistory = showAll ? filteredHistory : filteredHistory.slice(0, INITIAL_VISIBLE_SESSIONS);
  const grouped = groupHistoryByMonth(visibleHistory);

  return (
    <>
      {pwModal && (
        <PasswordModal
          action={pwModal.type === 'edit' ? 'Podaj kod dostępu aby edytować sesję.' : 'Podaj kod dostępu aby usunąć sesję. Uwaga: usunięcie przeliczy salda wszystkich graczy.'}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPwModal(null)}
          playSound={playSound}
        />
      )}

      <PlayerFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        playerNames={playerNames}
        filterPlayer={filterPlayer}
        onSelect={setFilterPlayer}
      />

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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
              {history.length} REKORDÓW
            </span>
          }
        />

        {/* ── 2. BOOT TEXT ──────────────────────────────────────────── */}
        {/* Zieleń przy 70% krycia schodziła w trybie jasnym do ~2,6:1. */}
        <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--co-surface-2)', border: '1px solid var(--co-border)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-green)', lineHeight: 1.6 }}>
            {'>'} System OK
            <br />
            {'>'} {history.length} rekordów znaleziono
            <br />
            {'>'} Dostęp przyznany<span style={{ animation: 'blink-cursor 1s step-end infinite', color: 'var(--co-green)' }}>▮</span>
          </p>
        </div>

        {/* ── 3. WYKRES TRENDU ──────────────────────────────────────── */}
        {history.length >= 2 && (
          <AttendanceTrendChart history={history} />
        )}

        {/* ── 4. PASEK KONTROLEK (filtr + sort + CSV) ─────────────── */}
        {playerNames && playerNames.length > 0 && (
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

            {/* Etykieta filtra */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--co-tint)', border: '1px solid var(--co-tint-hi)', clipPath: CLIP.badge, flexShrink: 0 }}>
              <Search size={11} style={{ color: 'var(--co-dim)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>FILTR</span>
            </div>

            {isMobile ? (
              <>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8125rem',
                    letterSpacing: '0.1em',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'var(--co-border)',
                    color: filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
                    background: 'transparent',
                    clipPath: CLIP.badge,
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {filterPlayer || 'WSZYSCY'}
                </button>

                {filterPlayer && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
                    {filteredHistory.length} sesji
                  </span>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setFilterPlayer('')}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.8125rem',
                    letterSpacing: '0.1em',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-border)',
                    color: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
                    background: !filterPlayer ? 'var(--co-tint-hi)' : 'transparent',
                    clipPath: CLIP.badge,
                    transition: 'all 0.15s',
                  }}
                >
                  WSZYSCY
                </button>
                {playerNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setFilterPlayer(prev => prev === name ? '' : name)}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.8125rem',
                      letterSpacing: '0.1em',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-border)',
                      color: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-dim)',
                      background: filterPlayer === name ? 'var(--co-tint-hi)' : 'transparent',
                      clipPath: CLIP.badge,
                      transition: 'all 0.15s',
                    }}
                  >
                    {name}
                  </button>
                ))}

                {filterPlayer && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
                    {filteredHistory.length} sesji
                  </span>
                )}
              </>
            )}

            {/* Rozpychacz i separator były zwykłymi elementami zawijanego
                kontenera: gdy chipy graczy przechodziły do drugiej linii,
                rozpychacz spadał do własnego rzędu, a kreska zostawała sama
                na początku linii. Akcje mają teraz osobną, nierozdzielną grupę. */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div aria-hidden="true" style={{ width: 1, height: 18, background: 'var(--co-border)' }} />

            {/* Sort */}
            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              title={sortOrder === 'desc' ? 'Najnowsze pierwsze' : 'Najstarsze pierwsze'}
              aria-label="Zmień kolejność"
              className="icon-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                minHeight: 36, padding: '6px 10px', cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--co-border)',
                color: 'var(--co-dim)',
                clipPath: CLIP.badge,
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em',
                flexShrink: 0,
              }}
            >
              <ArrowUpDown size={12} aria-hidden="true" />
              {sortOrder === 'desc' ? 'NOWE' : 'STARE'}
            </button>

            {/* CSV */}
            <button
              onClick={handleExportCSV}
              title="Pobierz CSV"
              aria-label="Eksportuj CSV"
              className="icon-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                minHeight: 36, padding: '6px 10px', cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--co-border)',
                color: 'var(--co-dim)',
                clipPath: CLIP.badge,
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em',
                flexShrink: 0,
              }}
            >
              <Download size={12} aria-hidden="true" />
              CSV
            </button>
            </div>
          </div>
        )}

        {/* ── 5. EMPTY STATE ────────────────────────────────────────── */}
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays style={{ margin: '0 auto 16px', color: 'var(--co-dim)' }} size={40} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
              BRAK DANYCH
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-dim)', marginTop: 8 }}>
              {'>'} Dodaj pierwszą sesję w zakładce DODAJ_
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
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--co-cyan)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-dim)' }}>[{rows.length}x]</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, var(--co-tint-line), transparent)' }} />
              </div>

              {/* Log entries */}
              <div>
                {rows.map((row) => {
                  if (editing?.id === row.id) return (
                    <EditSessionForm
                      key={row.id}
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
                  );

                  if (deletingId === row.id) return (
                    <DeleteConfirmation
                      key={row.id}
                      row={row}
                      isDeleting={isDeleting}
                      onConfirm={handleDelete}
                      onCancel={() => setDeletingId(null)}
                    />
                  );

                  return (
                    <LogEntry key={row.id} row={row} onEdit={requestEdit} onDelete={requestDelete} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Hover przez klasę, nie przez handlery JS — na dotyku `mouseenter`
            wypalał się przy tapnięciu i stan zostawał do kolejnego kliknięcia. */}
        {!showAll && filteredHistory.length > INITIAL_VISIBLE_SESSIONS && (
          <button
            onClick={() => setShowAll(true)}
            className="cyber-button-outline"
            style={{ display: 'block', width: '100%', marginTop: 16, minHeight: 44, padding: '12px' }}
          >
            Pokaż wszystkie ({filteredHistory.length} sesji)
          </button>
        )}
      </div>
    </>
  );
}
