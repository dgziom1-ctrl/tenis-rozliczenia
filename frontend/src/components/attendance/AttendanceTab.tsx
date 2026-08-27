import { useMemo, useState, useCallback, useEffect } from 'react';
import { SOUND_TYPES } from '@/constants';
import { calculatePlayerStats, assignRankingPlaces, calculateSeasonPlayerStats } from '@/utils/rankings';
import { groupSessionsByMonth, getAvailableSeasons, filterHistoryByYear, getWrappedSeason } from '@/utils/sessions';
import { computeWrappedStats } from '@/utils/wrapped';
import { Film } from 'lucide-react';
import Leaderboard from './Leaderboard';
import RankingHistoryChart from './RankingHistoryChart';
import MonthlyReport from './MonthlyReport';
import PlayerSessionModal from './PlayerSessionModal';
import SeasonSelector from './SeasonSelector';
import WrappedModal from './WrappedModal';
import type { HistoryEntry, PlayerStats, RankedPlayer, SoundType, Summary } from '@/types/ui';

interface AttendanceTabProps {
  players: PlayerStats[];
  history: HistoryEntry[];
  summary: Summary;
  playSound?: (type: SoundType) => void;
  initialPlayer: string | null;
  onInitialPlayerConsumed?: () => void;
}

// ─── Main ────────────────────────────────────────────────────────
export default function AttendanceTab({ players, history, summary, playSound, initialPlayer, onInitialPlayerConsumed }: AttendanceTabProps) {
  const totalWeeks = summary?.totalWeeks || 0;
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  // `undefined` = użytkownik jeszcze nie wybierał, więc obowiązuje domyślny sezon.
  // Zwykły stan startowy tu nie wystarcza: przy pierwszym renderze historia bywa
  // pusta (dane dochodzą z bazy), a wtedy wybór zamarzłby na „wszystkie".
  const [chosenSeason, setChosenSeason] = useState<number | null | undefined>(undefined);
  const [wrappedYear, setWrappedYear] = useState<number | null>(null);

  // Auto-otwórz modal gracza gdy przyszło powiadomienie push o serii
  useEffect(() => {
    if (!initialPlayer) return;
    setSelectedPlayer(initialPlayer);
    if (onInitialPlayerConsumed) onInitialPlayerConsumed();
  }, [initialPlayer, onInitialPlayerConsumed]);

  const seasons = useMemo(() => getAvailableSeasons(history), [history]);
  const currentYear = new Date().getFullYear();

  // Nowy rok ma zaczynać nową rywalizację, więc domyślnie pokazujemy bieżący
  // sezon zamiast sumy wszystkich lat — inaczej w styczniu ranking to zamrożona
  // tabela z grudnia, której jedna nowa sesja w mianowniku pięćdziesięciu nie ruszy.
  //
  // „Bieżący" bierzemy z danych (najnowszy rok z sesjami), nie z zegara: 1 stycznia,
  // zanim padnie pierwsza sesja, nie ma jeszcze czego pokazywać. Przy jednym sezonie
  // w historii filtr jest ukryty, więc domyślnie zostaje widok pełny.
  const defaultSeason = seasons.length > 1 ? seasons[0] : null;
  const selectedSeason = chosenSeason === undefined ? defaultSeason : chosenSeason;

  // Filter history by selected season
  const seasonHistory = useMemo(
    () => selectedSeason ? filterHistoryByYear(history, selectedSeason) : history,
    [history, selectedSeason]
  );

  // Dorobek liczony przez całą historię. Ranking jest sezonowy, ale odznaki,
  // ranga i seria nie mogą znikać po przełączeniu filtra — „50 sesji" znaczy
  // 50 sesji w życiu, nie 50 w tym roku.
  const lifetimeStats = useMemo(
    () => calculatePlayerStats(players, history, totalWeeks),
    [players, history, totalWeeks],
  );

  // Use season-aware stats when filtering, global stats for all-time
  const stats = useMemo(() => {
    if (selectedSeason) {
      return calculateSeasonPlayerStats(players, seasonHistory, history);
    }
    return lifetimeStats;
  }, [players, history, seasonHistory, lifetimeStats, selectedSeason]);

  const ranked = useMemo(() => {
    const sorted = [...stats].sort((a, b) => {
      if (b.attendancePercentage !== a.attendancePercentage) return b.attendancePercentage - a.attendancePercentage;
      if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;
      return a.name.localeCompare(b.name, 'pl');
    });
    return assignRankingPlaces(sorted);
  }, [stats]);

  const handleSelect = useCallback((name: string) => {
    setSelectedPlayer(name);
    if (!playSound) return;
    const player = ranked.find(p => p.name === name);
    if (player?.place === 1) {
      playSound(SOUND_TYPES.RANK1);
    } else {
      playSound(SOUND_TYPES.CLICK);
    }
  }, [ranked, playSound]);

  const podiumPlayers = useMemo(() => {
    const byPlace: Record<number, RankedPlayer[]> = {};
    ranked.forEach(p => { if (!byPlace[p.place]) byPlace[p.place] = []; byPlace[p.place].push(p); });
    return [1, 2, 3].filter(place => byPlace[place]?.length > 0).map(place => ({ place, players: byPlace[place] }));
  }, [ranked]);

  const monthlyStats = useMemo(() => groupSessionsByMonth(seasonHistory), [seasonHistory]);

  const selectedStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return ranked.find(p => p.name === selectedPlayer);
  }, [selectedPlayer, ranked]);

  const selectedLifetime = useMemo(() => {
    if (!selectedPlayer) return null;
    return lifetimeStats.find(p => p.name === selectedPlayer) ?? null;
  }, [selectedPlayer, lifetimeStats]);

  // Wrapped stats for the selected past year
  const wrappedStats = useMemo(() => {
    if (!wrappedYear) return null;
    return computeWrappedStats(history, players, wrappedYear);
  }, [wrappedYear, history, players]);

  const wrappedSeason = useMemo(
    () => getWrappedSeason(seasons, selectedSeason, currentYear),
    [seasons, selectedSeason, currentYear],
  );

  const handleCloseModal = useCallback(() => setSelectedPlayer(null), []);
  const handleCloseWrapped = useCallback(() => setWrappedYear(null), []);

  return (
    <>
    {selectedStats && (
      <PlayerSessionModal
        player={selectedStats}
        history={seasonHistory}
        lifetime={selectedLifetime}
        lifetimeHistory={history}
        seasonLabel={selectedSeason ? String(selectedSeason) : null}
        onClose={handleCloseModal}
      />
    )}
    {wrappedStats && (
      <WrappedModal stats={wrappedStats} onClose={handleCloseWrapped} />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-in-up 0.3s ease-out' }}>
      <SeasonSelector seasons={seasons} selected={selectedSeason} onChange={setChosenSeason} />

      {/* Wrapped button — wybrany zakończony sezon albo rok, który właśnie się
          skończył.
          Był jedynym magentowym elementem na stronie, jedynym przyciskiem na
          całą szerokość i jedynym z emoji w etykiecie — czytał się jak wklejona
          reklama, nie jak część interfejsu. Teraz zwykły przycisk akcji. */}
      {wrappedSeason && (
        <button
          onClick={() => setWrappedYear(wrappedSeason)}
          className="cyber-button-outline"
          style={{
            alignSelf: 'flex-start',
            display: 'flex', alignItems: 'center', gap: 8,
            minHeight: 44, padding: '10px 20px',
          }}
        >
          <Film size={14} aria-hidden="true" />
          Podsumowanie roku {wrappedSeason}
        </button>
      )}

      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} onSelect={handleSelect} />
      <RankingHistoryChart players={players} history={seasonHistory} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
    </div>
  </>
  );
}
