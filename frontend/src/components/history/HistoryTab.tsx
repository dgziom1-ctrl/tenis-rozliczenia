import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Terminal, CalendarDays, Search, Download, ArrowUpDown } from 'lucide-react';
import { updateWeek, deleteWeek } from '@/lib/firebase';
import { groupHistoryByMonth } from '@/utils/sessions';
import { useToast } from '../common/Toast';
import { PasswordModal } from '../common/SharedUI';
import { SPORT } from '@/constants';
import UndoBar from '../common/UndoBar';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { HistoryEntry, SoundType } from '../../types/ui';
import type { Sport } from '../../types/domain';
import LogEntry from './LogEntry';
import AttendanceTrendChart from './AttendanceTrendChart';
import EditSessionForm from './EditSessionForm';
import DeleteConfirmation from './DeleteConfirmation';
import PlayerFilterSheet from './PlayerFilterSheet';

interface EditForm {
  date: string;
  cost: string | number;
  present: string[];
  multiPlayers: string[];
  sport: Sport;
  racketCost?: number;
  ownRacketPlayers?: string[];
  overtimePlayers?: string[];
  overtimeCost?: string | number;
}

interface HistoryTabProps {
  history: HistoryEntry[];
  playerNames: string[];
  playSound: (type: SoundType) => void;
}

export default function HistoryTab({ history, playerNames, playSound }: HistoryTabProps) {
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editForm,     setEditForm]     = useState<EditForm>({} as EditForm);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [_isDeleting,   _setIsDeleting]   = useState<string | null>(null);
  const [pwModal,      setPwModal]      = useState<{ type: 'edit'; row: HistoryEntry } | { type: 'delete'; rowId: string } | null>(null);
  const [filterPlayer, setFilterPlayer] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder,    setSortOrder]    = useState<'desc' | 'asc'>('desc');
  const [showAll,      setShowAll]      = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showError, showSuccess } = useToast();
  const isMobile = useIsMobile();

  const parsedEditCost = editForm.cost === '' || editForm.cost === null || editForm.cost === undefined ? NaN : parseFloat(String(editForm.cost));
  const isEditCostValid = Number.isFinite(parsedEditCost) && parsedEditCost >= 0;
  const editCostError = isEditCostValid
    ? null
    : (editForm.cost === '' ? 'Wpisz koszt sesji' : 'Koszt musi być liczbą >= 0');

  const filteredHistory = useMemo(() => {
    let h = !filterPlayer ? history : history.filter(s => s.presentPlayers.includes(filterPlayer));
    if (pendingDeleteId) h = h.filter(s => s.id !== pendingDeleteId);
    return sortOrder === 'asc' ? [...h].reverse() : h;
  }, [history, filterPlayer, sortOrder, pendingDeleteId]);

  useEffect(() => { setShowAll(false); }, [filterPlayer, sortOrder]);

  const handleExportCSV = () => {
    let url: string | undefined;
    try {
      const rows = [
        ['Data', 'Sport', 'Koszt całkowity', 'Na osobę', 'Liczba graczy', 'Obecni', 'Multisport'],
        ...filteredHistory.map(s => [
          s.datePlayed,
          s.sport === SPORT.SQUASH ? 'squash' : 'ping-pong',
          s.totalCost,
          s.costPerPerson?.toFixed(2) ?? '',
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
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  const requestEdit   = (row: HistoryEntry) => setPwModal({ type: 'edit', row });
  const requestDelete = (id: string)  => setPwModal({ type: 'delete', rowId: id });

  const handlePasswordConfirm = () => {
    if (!pwModal) return;
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      setEditingId(row.id);
      setEditForm({ date: row.datePlayed, cost: row.totalCost, present: [...row.presentPlayers], multiPlayers: [...row.multisportPlayers], sport: row.sport || SPORT.PINGPONG, racketCost: row.racketCost, ownRacketPlayers: row.ownRacketPlayers ? [...row.ownRacketPlayers] : [], overtimePlayers: row.overtimePlayers ? [...row.overtimePlayers] : [], overtimeCost: row.overtimeCost ?? '' });
    } else if (pwModal.type === 'delete') {
      setDeletingId(pwModal.rowId);
    }
    setPwModal(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({} as EditForm); };

  const saveEdit = async () => {
    if (isSaving) return;
    if (!isEditCostValid) {
      showError(editCostError || 'Nieprawidłowy koszt');
      return;
    }
    setIsSaving(true);
    try {
      const overtimeInPresent = (editForm.overtimePlayers || []).filter(p => editForm.present.includes(p));
      const parsedOvertimeCost = editForm.overtimeCost === '' || editForm.overtimeCost == null ? NaN : parseFloat(String(editForm.overtimeCost));
      const hasOvertime = editForm.sport !== SPORT.SQUASH && overtimeInPresent.length > 0 && Number.isFinite(parsedOvertimeCost) && parsedOvertimeCost > 0;
      const result = await updateWeek(editingId!, { date: editForm.date, cost: parsedEditCost, present: editForm.present, multiPlayers: editForm.multiPlayers, sport: editForm.sport || SPORT.PINGPONG, racketCost: editForm.racketCost, ownRacketPlayers: editForm.ownRacketPlayers, overtimePlayers: hasOvertime ? overtimeInPresent : [], overtimeCost: hasOvertime ? parsedOvertimeCost : 0 });
      if (!result.success) { showError(result.error || 'Nie udało się zapisać sesji'); return; }
      setEditingId(null); setEditForm({} as EditForm);
    } finally { setIsSaving(false); }
  };

  const togglePresent = (name: string) => {
    setEditForm(prev => {
      const inList = (prev.present || []).includes(name);
      return {
        ...prev,
        present: inList ? prev.present.filter(p => p !== name) : [...prev.present, name],
        multiPlayers: inList ? (prev.multiPlayers || []).filter(p => p !== name) : prev.multiPlayers,
        ownRacketPlayers: inList ? (prev.ownRacketPlayers || []).filter(p => p !== name) : prev.ownRacketPlayers,
        overtimePlayers: inList ? (prev.overtimePlayers || []).filter(p => p !== name) : prev.overtimePlayers,
      };
    });
  };

  const toggleMulti = (name: string) => {
    setEditForm(prev => {
      const inList = (prev.multiPlayers || []).includes(name);
      return { ...prev, multiPlayers: inList ? prev.multiPlayers.filter(p => p !== name) : [...prev.multiPlayers, name] };
    });
  };

  const toggleOvertime = (name: string) => {
    setEditForm(prev => {
      const list = prev.overtimePlayers || [];
      const inList = list.includes(name);
      return { ...prev, overtimePlayers: inList ? list.filter(p => p !== name) : [...list, name] };
    });
  };

  const UNDO_SECONDS = 8;

  const clearUndoTimers = useCallback(() => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    if (undoCountdownRef.current) { clearInterval(undoCountdownRef.current); undoCountdownRef.current = null; }
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(null);
    setPendingDeleteId(id);
    setUndoSecondsLeft(UNDO_SECONDS);
    clearUndoTimers();

    undoCountdownRef.current = setInterval(() => {
      setUndoSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(undoCountdownRef.current!); undoCountdownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);

    undoTimerRef.current = setTimeout(async () => {
      clearUndoTimers();
      try {
        const result = await deleteWeek(id);
        if (!result.success) { showError(result.error || 'Nie udało się usunąć sesji'); }
      } catch { showError('Nie udało się usunąć sesji'); }
      setPendingDeleteId(null);
    }, UNDO_SECONDS * 1000);
  };

  const handleUndo = useCallback(() => {
    clearUndoTimers();
    setPendingDeleteId(null);
    setUndoSecondsLeft(0);
  }, [clearUndoTimers]);

  useEffect(() => {
    return () => clearUndoTimers();
  }, [clearUndoTimers]);

  const visibleHistory = showAll ? filteredHistory : filteredHistory.slice(0, 50);
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
        clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)',
        padding: '20px 18px',
        animation: 'slide-in-up 0.3s ease-out',
      }}>

        {/* ── 1. HEADER ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--co-border)' }}>
          <div style={{ padding: '6px 8px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
            <Terminal size={14} style={{ color: 'var(--co-green)', display: 'block' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--co-green)' }}>
            HISTORIA
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(0,229,255,0.2), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)' }}>
            {history.length} REKORDÓW
          </span>
        </div>

        {/* ── 2. BOOT TEXT ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--co-dark)', border: '1px solid var(--co-border)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--co-green)', lineHeight: 1.6, opacity: 0.7 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)', flexShrink: 0 }}>
              <Search size={11} style={{ color: 'var(--co-dim)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>FILTR</span>
            </div>

            {isMobile ? (
              <>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'var(--co-border)',
                    color: filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
                    background: 'transparent',
                    clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {filterPlayer || 'WSZYSCY'}
                </button>

                {filterPlayer && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)' }}>
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
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-border)',
                    color: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
                    background: !filterPlayer ? 'rgba(0,229,255,0.08)' : 'transparent',
                    clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
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
                      fontSize: '0.7rem',
                      letterSpacing: '0.08em',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-border)',
                      color: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-dim)',
                      background: filterPlayer === name ? 'rgba(0,229,255,0.08)' : 'transparent',
                      clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {name}
                  </button>
                ))}

                {filterPlayer && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)' }}>
                    {filteredHistory.length} sesji
                  </span>
                )}
              </>
            )}

            <div style={{ flex: 1 }} />
            <div style={{ width: 1, height: 18, background: 'var(--co-border)', flexShrink: 0 }} />

            {/* Sort */}
            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              title={sortOrder === 'desc' ? 'Najnowsze pierwsze' : 'Najstarsze pierwsze'}
              aria-label="Zmień kolejność"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--co-border)',
                color: 'var(--co-dim)',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <ArrowUpDown size={10} />
              {sortOrder === 'desc' ? 'NOWE' : 'STARE'}
            </button>

            {/* CSV */}
            <button
              onClick={handleExportCSV}
              title="Pobierz CSV"
              aria-label="Eksportuj CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--co-border)',
                color: 'var(--co-dim)',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <Download size={10} />
              CSV
            </button>
          </div>
        )}

        {/* ── 5. EMPTY STATE ────────────────────────────────────────── */}
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays style={{ margin: '0 auto 16px', color: 'var(--co-dim)' }} size={40} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
              BRAK DANYCH
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)', marginTop: 8 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--co-cyan)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)' }}>[{rows.length}x]</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(0,229,255,0.25), transparent)' }} />
              </div>

              {/* Log entries */}
              <div>
                {rows.map((row) => {
                  const isEditingRow  = editingId  === row.id;
                  const isDeletingRow = deletingId === row.id;

                  if (isEditingRow) return (
                    <EditSessionForm
                      key={row.id}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      playerNames={playerNames}
                      isSaving={isSaving}
                      isEditCostValid={isEditCostValid}
                      editCostError={editCostError}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                      onTogglePresent={togglePresent}
                      onToggleMulti={toggleMulti}
                      onToggleOvertime={toggleOvertime}
                    />
                  );

                  if (isDeletingRow) return (
                    <DeleteConfirmation
                      key={row.id}
                      row={row}
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
        {!showAll && filteredHistory.length > 50 && (
          <button
            onClick={() => setShowAll(true)}
            style={{
              display: 'block', width: '100%', marginTop: 16, padding: '12px',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--co-cyan)',
              background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.3)',
              cursor: 'pointer',
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; }}
          >
            Pokaż wszystkie ({filteredHistory.length} sesji)
          </button>
        )}
      </div>

      {pendingDeleteId && (
        <div style={{ position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', left: 8, right: 8, zIndex: 80, maxWidth: 500, margin: '0 auto' }}>
          <UndoBar
            message="Sesja usunięta"
            secondsLeft={undoSecondsLeft}
            progressPct={(undoSecondsLeft / UNDO_SECONDS) * 100}
            onUndo={handleUndo}
          />
        </div>
      )}
    </>
  );
}
