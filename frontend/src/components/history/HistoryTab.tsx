import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Terminal, CalendarDays, Search, Download, ArrowUpDown } from 'lucide-react';
import { updateWeek, deleteWeekWithSnapshot, restoreWeek } from '@/lib/firebase';
import { groupHistoryByMonth, getAvailableSeasons, filterHistoryByYear } from '@/utils/sessions';
import SeasonSelector from '../attendance/SeasonSelector';
import { parseAmount, isValidAmount, formatDate } from '@/utils/format';
import { getCourtAmount, getRacketSelection, getTotalWithRackets, inferRacketPricing } from '@/utils/sessionCost';
import { useToast } from '../common/Toast';
import { PasswordModal, PanelHeader } from '../common/SharedUI';
import UndoBar from '../common/UndoBar';
import { SOUND_TYPES, SPORT, SPORT_LABEL, RACKET_PRICE, UNDO_TIMEOUT_SECONDS } from '@/constants';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useUndoTimer } from '@/hooks/useUndoTimer';
import type { Week } from '@/types/domain';
import type { HistoryEntry, SoundType, SessionEditForm } from '../../types/ui';
import LogEntry from './LogEntry';
import AttendanceTrendChart from './AttendanceTrendChart';
import EditSessionForm from './EditSessionForm';
import PlayerFilterSheet from './PlayerFilterSheet';
import { CLIP } from '@/constants/styles';

/** Ile sesji pokazujemy na raz. 50 rekordów dawało 17 863 px strony na telefonie. */
const SESSIONS_PAGE_SIZE = 12;

/** Edytowana sesja razem z jej identyfikatorem — jedno albo drugie nigdy nie występuje osobno. */
interface EditState {
  id: string;
  form: SessionEditForm;
}

interface PendingDeletedWeek {
  week: Week;
  token: number;
}

interface HistoryTabProps {
  history: HistoryEntry[];
  playerNames: string[];
  playSound: (type: SoundType) => void;
}

export default function HistoryTab({ history, playerNames, playSound }: HistoryTabProps) {
  const [editing,      setEditing]      = useState<EditState | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [pwModal,      setPwModal]      = useState<{ type: 'edit'; row: HistoryEntry } | { type: 'delete'; rowId: string } | null>(null);
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterSport, setFilterSport] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chosenSeason, setChosenSeason] = useState<number | null | undefined>(undefined);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder,    setSortOrder]    = useState<'desc' | 'asc'>('desc');
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PAGE_SIZE);
  const { showError, showSuccess } = useToast();
  const { undoToast, progressPct, startUndo, dismissUndo } = useUndoTimer<PendingDeletedWeek>();
  const isMobile = useIsMobile();

  // Ref blokują zapis, zanim stan zdąży się przerysować — chroni przed dwoma
  // szybkimi kliknięciami w ten sam przycisk.
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const undoingRef = useRef(false);
  const undoSequenceRef = useRef(0);
  const activeUndoTokenRef = useRef<number | null>(null);

  const editForm = editing?.form;
  const parsedEditCost = parseAmount(editForm?.cost ?? '');
  const isEditCostValid = isValidAmount(parsedEditCost, 0);
  const editCostError = isEditCostValid
    ? null
    : (editForm?.cost === '' ? 'Wpisz koszt kortu' : 'Koszt musi być liczbą >= 0');

  const seasons = useMemo(() => getAvailableSeasons(history), [history]);
  const selectedSeason = chosenSeason === undefined ? null : chosenSeason;
  const seasonHistory = useMemo(
    () => filterHistoryByYear(history, selectedSeason),
    [history, selectedSeason],
  );

  const filteredHistory = useMemo(() => {
    let h = seasonHistory;
    if (filterPlayer) h = h.filter(s => s.presentPlayers.includes(filterPlayer));
    if (filterSport) h = h.filter(s => s.sport === filterSport);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      h = h.filter(s =>
        s.datePlayed.toLowerCase().includes(q) ||
        (SPORT_LABEL[s.sport] ?? '').toLowerCase().includes(q) ||
        s.presentPlayers.some(p => p.toLowerCase().includes(q)) ||
        s.multisportPlayers.some(p => p.toLowerCase().includes(q)),
      );
    }
    return sortOrder === 'asc' ? [...h].reverse() : h;
  }, [seasonHistory, filterPlayer, filterSport, searchQuery, sortOrder]);

  useEffect(() => { setVisibleCount(SESSIONS_PAGE_SIZE); }, [filterPlayer, filterSport, searchQuery, sortOrder, selectedSeason]);

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
      // Ochrona przed CSV injection: wartości zaczynające się od znaku formuły
      // („=", „+", „-", „@") mogą być wykonane przez arkusz kalkulacyjny.
      const sanitizeCsvCell = (value: unknown): string => {
        const str = String(value ?? '');
        return /^[=+\-@\t\r]/.test(str.trim()) ? `'${str}` : str;
      };
      const csv = rows.map(r => r.map(v => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`).join(',')).join('\n');
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
        startUndo({ week: result.deletedWeek, token });
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
      const { week, token } = undoToast.payload;
      const result = await restoreWeek(week);
      if (!result.success) {
        playSound(SOUND_TYPES.ERROR);
        showError(result.error || 'Nie udało się przywrócić sesji');
        return;
      }
      if (activeUndoTokenRef.current === token) {
        activeUndoTokenRef.current = null;
        dismissUndo();
      }
      playSound(SOUND_TYPES.SUCCESS);
      showSuccess('Sesja przywrócona');
    } catch {
      playSound(SOUND_TYPES.ERROR);
      showError('Nie udało się przywrócić sesji');
    } finally {
      undoingRef.current = false;
    }
  }, [undoToast, dismissUndo, playSound, showError, showSuccess]);

  const handlePasswordConfirm = () => {
    if (!pwModal) return;
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      const racketPricing = inferRacketPricing(row.racketCost);
      setEditing({
        id: row.id,
        form: {
          date: row.datePlayed,
          // Formularz pyta o sam kort — tak jak przy dodawaniu. Rakiety
          // dokładamy dopiero przy zapisie, więc edycja bez zmian nie zmienia
          // kwoty sesji.
          cost: getCourtAmount(row.totalCost, row.racketCost),
          present: [...row.presentPlayers],
          multiPlayers: [...row.multisportPlayers],
          sport: row.sport || SPORT.PINGPONG,
          racketCount: racketPricing.racketCount,
          racketPrice: racketPricing.racketPrice,
          ownRacketPlayers: row.ownRacketPlayers ? [...row.ownRacketPlayers] : [],
          // Stare sesje nie mają tych pól — zostawiamy `undefined`, żeby
          // zapis nie włączył im po cichu limitu kart MultiSport.
          courtCount: row.courtCount,
          durationHours: row.durationHours,
        },
      });
    } else {
      void handleDelete(pwModal.rowId);
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

  const visibleHistory = filteredHistory.slice(0, visibleCount);
  const hasMoreSessions = visibleCount < filteredHistory.length;
  const grouped = groupHistoryByMonth(visibleHistory);

  return (
    <>
      {pwModal && (
        <PasswordModal
          action={pwModal.type === 'edit' ? 'Podaj kod dostępu aby edytować sesję.' : `Podaj kod dostępu, aby usunąć sesję. Przez ${UNDO_TIMEOUT_SECONDS} s można ją cofnąć.`}
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

      {undoToast && (
        <div style={{ marginBottom: 12 }}>
          <UndoBar
            message={<>Sesja z {formatDate(undoToast.payload.week.date)} usunięta</>}
            secondsLeft={undoToast.secondsLeft}
            progressPct={progressPct}
            onUndo={() => { void handleUndoDelete(); }}
            buttonLabel="cofnij"
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
              {filteredHistory.length}{selectedSeason || filterPlayer ? ` / ${history.length}` : ''} REKORDÓW
            </span>
          }
        />

        {/* ── 2. BOOT TEXT ──────────────────────────────────────────── */}
        {/* Zieleń przy 70% krycia schodziła w trybie jasnym do ~2,6:1. */}
        <div className="glass-panel" style={{ marginBottom: 20, padding: '10px 14px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-green)', lineHeight: 1.6 }}>
            {'>'} System OK
            <br />
            {'>'} {filteredHistory.length}{selectedSeason || filterPlayer ? ` z ${history.length}` : ''} rekordów znaleziono
            <br />
            {'>'} Dostęp przyznany<span style={{ animation: 'blink-cursor 1s step-end infinite', color: 'var(--co-green)' }}>▮</span>
          </p>
        </div>

        {/* ── 3. WYKRES TRENDU ──────────────────────────────────────── */}
        {seasonHistory.length >= 2 && (
          <AttendanceTrendChart history={seasonHistory} />
        )}

        {seasons.length > 1 && (
          <SeasonSelector seasons={seasons} selected={selectedSeason} onChange={setChosenSeason} />
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
                    transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
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
                    transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
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
                      transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
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
            {/* Filtr po sporcie */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => setFilterSport('')} style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', padding: '4px 8px', cursor: 'pointer', border: '1px solid', borderColor: !filterSport ? 'var(--co-cyan)' : 'var(--co-border)', color: !filterSport ? 'var(--co-cyan)' : 'var(--co-dim)', background: !filterSport ? 'var(--co-tint-hi)' : 'transparent', clipPath: CLIP.badge }}>WSZYSTKIE SPORTY</button>
              {Object.entries(SPORT_LABEL).map(([key, label]) => (
                <button key={key} onClick={() => setFilterSport(prev => prev === key ? '' : key)} style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', padding: '4px 8px', cursor: 'pointer', border: '1px solid', borderColor: filterSport === key ? 'var(--co-cyan)' : 'var(--co-border)', color: filterSport === key ? 'var(--co-cyan)' : 'var(--co-dim)', background: filterSport === key ? 'var(--co-tint-hi)' : 'transparent', clipPath: CLIP.badge }}>{label.toUpperCase()}</button>
              ))}
            </div>

            {/* Wyszukiwarka tekstowa */}
            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Szukaj (data, gracz, sport)..." aria-label="Szukaj w historii" className="cyber-input" style={{ flex: '1 1 160px', minWidth: 140, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', clipPath: CLIP.badge }} />

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

        {/* ── 5. LICZNIK STRONY ─────────────────────────────────────── */}
        {filteredHistory.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap', margin: '0 0 16px',
          }}>
            <p aria-live="polite" style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
              Pokazano <span style={{ color: 'var(--co-cyan)' }}>{visibleHistory.length}</span> z {filteredHistory.length} sesji
            </p>
            {hasMoreSessions && (
              <button
                type="button"
                onClick={() => setVisibleCount(count => Math.min(count + SESSIONS_PAGE_SIZE, filteredHistory.length))}
                className="cyber-button-outline"
                style={{ minHeight: 44, padding: '6px 12px', fontSize: '0.75rem' }}
              >
                Pokaż więcej
              </button>
            )}
          </div>
        )}

        {/* ── 6. EMPTY STATE ────────────────────────────────────────── */}
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

        {history.length > 0 && filteredHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-dim)' }}>
              {'>'} Brak sesji dla wybranych filtrów_
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
        {hasMoreSessions && (
          <button
            type="button"
            onClick={() => setVisibleCount(count => Math.min(count + SESSIONS_PAGE_SIZE, filteredHistory.length))}
            className="cyber-button-outline"
            style={{ display: 'block', width: '100%', marginTop: 16, minHeight: 44, padding: '12px' }}
          >
            Pokaż więcej ({filteredHistory.length - visibleHistory.length} pozostało)
          </button>
        )}
        {!hasMoreSessions && filteredHistory.length > SESSIONS_PAGE_SIZE && (
          <p style={{ margin: '16px 0 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)' }}>
            {'>'} To wszystkie sesje w tym widoku
          </p>
        )}
      </div>
    </>
  );
}
